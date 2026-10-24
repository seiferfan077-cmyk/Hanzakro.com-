import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { competitionAutomaticWebResearches, competitionEngineSources, competitionEngines, competitionMatches, competitionQuestions, competitionSourceInsights, lessonNotes, studyFiles } from "../drizzle/schema";
import { getDb } from "./db";
import { researchWeb } from "./webResearch";
import { downloadStudyFile, extractStudyFilePageRange } from "./studyFilePageIndex";
import { ocrCompetitionSourceImage } from "./competitionImageOcr";
import { ocrCompetitionPdf } from "./competitionPdfOcr";
import { extractPdfIndex, parsePdfPageIndex, selectPdfPageRange } from "./pdfIndex";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import type { MemberSlot } from "./workspaceAccess";
import { randomUUID } from "node:crypto";

const MAX_COMPETITION_PDF_BYTES = 30 * 1024 * 1024;
const automaticWebQuerySchema = {
  type: "object",
  properties: {
    query: { type: "string", minLength: 4, maxLength: 240 },
  },
  required: ["query"],
  additionalProperties: false,
};

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return db;
}

function clean(value: string | undefined, max: number) {
  return value?.replace(/\s+/g, " ").trim().slice(0, max) || null;
}

export async function listCompetitionEngines() {
  const db = await database();
  const engines = await db.select().from(competitionEngines).orderBy(desc(competitionEngines.updatedAt));
  const sourceRows = await db.select({ engineId: competitionEngineSources.engineId }).from(competitionEngineSources);
  return engines.map(engine => ({ ...engine, sourceCount: sourceRows.filter(source => source.engineId === engine.id).length }));
}

export async function getCompetitionEngine(id: number) {
  const db = await database();
  const engine = (await db.select().from(competitionEngines).where(eq(competitionEngines.id, id)).limit(1))[0];
  if (!engine) return null;
  const sources = await db.select().from(competitionEngineSources).where(eq(competitionEngineSources.engineId, id)).orderBy(desc(competitionEngineSources.isPrimary), desc(competitionEngineSources.createdAt));
  return { ...engine, sources };
}

export async function createCompetitionEngine(input: { title: string; subjectKey?: string; subjectName?: string; gradeLevel?: string; unitName?: string; lessonTitle?: string; questionCount: number; difficulty: number; questionTimeLimitSeconds?: number; member: MemberSlot }) {
  const db = await database();
  const questionTimeLimitSeconds = [0, 30, 60, 90, 120].includes(input.questionTimeLimitSeconds ?? 0) ? input.questionTimeLimitSeconds ?? 0 : 0;
  const result = await db.insert(competitionEngines).values({ title: input.title.trim().slice(0, 240), subjectKey: clean(input.subjectKey, 64), subjectName: clean(input.subjectName, 120), gradeLevel: clean(input.gradeLevel, 64), unitName: clean(input.unitName, 180), lessonTitle: clean(input.lessonTitle, 240), questionCount: Math.max(3, Math.min(20, Math.round(input.questionCount))), difficulty: Math.max(1, Math.min(4, Math.round(input.difficulty))), questionTimeLimitSeconds, createdBy: input.member, updatedBy: input.member });
  return getCompetitionEngine(Number(result[0].insertId));
}

export async function updateCompetitionEngineContext(input: { engineId: number; subjectKey?: string; subjectName?: string; gradeLevel?: string; unitName?: string; lessonTitle?: string; member: MemberSlot }) {
  const db = await database();
  await ensureDraftEngine(input.engineId);
  await db.update(competitionEngines).set({ subjectKey: clean(input.subjectKey, 64), subjectName: clean(input.subjectName, 120), gradeLevel: clean(input.gradeLevel, 64), unitName: clean(input.unitName, 180), lessonTitle: clean(input.lessonTitle, 240), updatedBy: input.member }).where(eq(competitionEngines.id, input.engineId));
  return getCompetitionEngine(input.engineId);
}

async function ensureDraftEngine(engineId: number) {
  const engine = await getCompetitionEngine(engineId);
  if (!engine) throw new Error("محرك المنافسة مش موجود.");
  if (engine.status !== "draft") throw new Error("المحرك ده اتقفل للتعديل بعد تجهيزه.");
  return engine;
}

async function deriveAutomaticWebQuery(input: { engineTitle: string; subjectName: string | null; gradeLevel: string | null; unitName: string | null; lessonTitle: string | null; label: string; contentSnapshot: string }) {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 220,
    responseFormat: { type: "json_schema", json_schema: { name: "competition_automatic_web_query", strict: true, schema: automaticWebQuerySchema } },
    messages: [
      { role: "system", content: "أنت تستخرج استعلام بحث تعليمي قصيراً من نص مصدر دراسي. أرجع JSON فقط. لا تخترع موضوعاً غير ظاهر في النص؛ اجمع الموضوع المركزي مع المادة أو الصف إن وُجدا. الاستعلام من 4 إلى 240 حرفاً ولا يتضمن رابطاً أو تعليمات." },
      { role: "user", content: `سياق المحرك: ${[input.engineTitle, input.subjectName, input.gradeLevel, input.unitName, input.lessonTitle].filter(Boolean).join(" — ")}\nاسم المصدر: ${input.label}\n\nنص المصدر:\n${input.contentSnapshot.slice(0, 16000)}` },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("تعذر استخراج موضوع بحث من المصدر.");
  const parsed = JSON.parse(content) as { query?: unknown };
  const query = typeof parsed.query === "string" ? parsed.query.replace(/\s+/g, " ").trim().slice(0, 240) : "";
  if (query.length < 4) throw new Error("موضوع البحث المستخرج غير كافٍ.");
  return query;
}

async function addAutomaticWebSupport(input: { engineId: number; sourceId: number; sourceLabel: string; contentSnapshot: string; member: MemberSlot }) {
  try {
    const engine = await getCompetitionEngine(input.engineId);
    if (!engine || engine.status !== "draft") return;
    const query = await deriveAutomaticWebQuery({ engineTitle: engine.title, subjectName: engine.subjectName, gradeLevel: engine.gradeLevel, unitName: engine.unitName, lessonTitle: engine.lessonTitle, label: input.sourceLabel, contentSnapshot: input.contentSnapshot });
    const result = await researchWeb(query);
    const source = result.sources.find(item => item.official && item.content.trim()) ?? result.sources.find(item => item.content.trim());
    if (!source) return;
    const db = await database();
    const duplicate = (await db.select({ id: competitionEngineSources.id }).from(competitionEngineSources).where(and(eq(competitionEngineSources.engineId, input.engineId), eq(competitionEngineSources.sourceUrl, source.url))).limit(1))[0];
    if (duplicate) return;
    const inserted = await db.insert(competitionEngineSources).values({ engineId: input.engineId, sourceType: "url", label: `بحث تلقائي موثق: ${source.title}`.slice(0, 300), sourceUrl: source.url, isPrimary: false, contentSnapshot: source.content.trim().slice(0, 120000), createdBy: input.member });
    const selectedSourceId = Number(inserted[0].insertId);
    await db.insert(competitionAutomaticWebResearches).values({ engineId: input.engineId, sourceId: input.sourceId, query, resultsJson: JSON.stringify(result.sources.map(item => ({ title: item.title, url: item.url, snippet: item.snippet, official: item.official }))), selectedSourceId });
  } catch (error) {
    console.warn("[Competition] Automatic web support skipped", error instanceof Error ? error.message : error);
  }
}

/**
 * Replays the same source-derived research path used at upload time.  It never
 * accepts a free-form query: the selected study material remains the origin of
 * the query and the web results remain supplemental, non-primary sources.
 */
export async function refreshCompetitionAutomaticWebSupport(input: { engineId: number; member: MemberSlot }) {
  const engine = await ensureDraftEngine(input.engineId);
  const sources = engine.sources.filter(source => source.sourceType !== "url" && source.contentSnapshot.trim().length >= 20);
  if (!sources.length) throw new Error("اختاروا كتاباً أو PDF أو صورة مقروءة أولاً؛ البحث المساعد يبدأ من مصدر الجلسة نفسه.");
  await Promise.all(sources.map(source => addAutomaticWebSupport({
    engineId: input.engineId,
    sourceId: source.id,
    sourceLabel: source.label,
    contentSnapshot: source.contentSnapshot,
    member: input.member,
  })));
  return listCompetitionAutomaticWebResearches(input.engineId);
}

async function appendSource(input: { engineId: number; sourceType: "lesson_note" | "study_file" | "text" | "url" | "image"; sourceRefId?: number; label: string; sourceUrl?: string; pageStart?: number; pageEnd?: number; contentSnapshot: string; member: MemberSlot }) {
  const db = await database();
  await ensureDraftEngine(input.engineId);
  const text = input.contentSnapshot.trim().slice(0, 120000);
  if (!text) throw new Error("المصدر ده مفيهوش نص صالح للتحليل.");
  const existing = await db.select({ id: competitionEngineSources.id }).from(competitionEngineSources).where(eq(competitionEngineSources.engineId, input.engineId)).limit(1);
  const inserted = await db.insert(competitionEngineSources).values({ engineId: input.engineId, sourceType: input.sourceType, sourceRefId: input.sourceRefId ?? null, label: input.label.trim().slice(0, 300), sourceUrl: clean(input.sourceUrl, 2048), pageStart: input.pageStart ?? null, pageEnd: input.pageEnd ?? null, isPrimary: existing.length === 0, contentSnapshot: text, createdBy: input.member });
  const sourceId = Number(inserted[0].insertId);
  await db.update(competitionEngines).set({ updatedBy: input.member }).where(eq(competitionEngines.id, input.engineId));
  if (input.sourceType !== "url") await addAutomaticWebSupport({ engineId: input.engineId, sourceId, sourceLabel: input.label, contentSnapshot: text, member: input.member });
  return getCompetitionEngine(input.engineId);
}

type AutomaticWebResult = { title: string; url: string; snippet: string; official: boolean };
function parseAutomaticWebResults(value: string): AutomaticWebResult[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AutomaticWebResult => Boolean(item) && typeof item === "object" && typeof (item as AutomaticWebResult).title === "string" && typeof (item as AutomaticWebResult).url === "string" && typeof (item as AutomaticWebResult).snippet === "string" && typeof (item as AutomaticWebResult).official === "boolean").slice(0, 3);
  } catch { return []; }
}

export async function listCompetitionAutomaticWebResearches(engineId: number) {
  const db = await database();
  const [runs, sources] = await Promise.all([
    db.select().from(competitionAutomaticWebResearches).where(eq(competitionAutomaticWebResearches.engineId, engineId)).orderBy(desc(competitionAutomaticWebResearches.createdAt)),
    db.select({ id: competitionEngineSources.id, label: competitionEngineSources.label, sourceUrl: competitionEngineSources.sourceUrl }).from(competitionEngineSources).where(eq(competitionEngineSources.engineId, engineId)),
  ]);
  return runs.map(run => ({ id: run.id, sourceId: run.sourceId, query: run.query, results: parseAutomaticWebResults(run.resultsJson), selectedSourceId: run.selectedSourceId, sourceLabel: sources.find(source => source.id === run.sourceId)?.label ?? "مصدر المحرك", selected: sources.find(source => source.id === run.selectedSourceId) ?? null, createdAt: run.createdAt }));
}

export async function getCompetitionAutomaticWebReader(input: { engineId: number; sourceId: number }) {
  const db = await database();
  const run = (await db.select({ selectedSourceId: competitionAutomaticWebResearches.selectedSourceId }).from(competitionAutomaticWebResearches).where(and(eq(competitionAutomaticWebResearches.engineId, input.engineId), eq(competitionAutomaticWebResearches.selectedSourceId, input.sourceId))).limit(1))[0];
  if (!run) throw new Error("المصدر ده مش ناتج عن بحث تلقائي للمحرك المحدد.");
  const source = (await db.select({ id: competitionEngineSources.id, label: competitionEngineSources.label, sourceUrl: competitionEngineSources.sourceUrl, contentSnapshot: competitionEngineSources.contentSnapshot }).from(competitionEngineSources).where(and(eq(competitionEngineSources.id, input.sourceId), eq(competitionEngineSources.engineId, input.engineId), eq(competitionEngineSources.sourceType, "url"))).limit(1))[0];
  if (!source) throw new Error("محتوى المصدر المختار لم يعد متاحاً للقراءة.");
  return source;
}

export async function addCompetitionTextSource(input: { engineId: number; label: string; content: string; member: MemberSlot }) {
  return appendSource({ engineId: input.engineId, sourceType: "text", label: input.label, contentSnapshot: input.content, member: input.member });
}

export async function addCompetitionNoteSource(input: { engineId: number; noteId: number; member: MemberSlot }) {
  const db = await database();
  const note = (await db.select().from(lessonNotes).where(eq(lessonNotes.id, input.noteId)).limit(1))[0];
  if (!note) throw new Error("ملاحظة الدرس مش موجودة.");
  return appendSource({ engineId: input.engineId, sourceType: "lesson_note", sourceRefId: note.id, label: `${note.subjectName} — ${note.lessonTitle}`, contentSnapshot: note.content, member: input.member });
}

export async function addCompetitionStudyFileSource(input: { engineId: number; fileId: number; pageStart?: number; pageEnd?: number; member: MemberSlot }) {
  const db = await database();
  const file = (await db.select().from(studyFiles).where(eq(studyFiles.id, input.fileId)).limit(1))[0];
  if (!file) throw new Error("كتاب المكتبة مش موجود.");
  const indexedPages = parsePdfPageIndex(file.pageTextIndex);
  const indexedText = indexedPages.map(page => `صفحة ${page.pageNumber}: ${page.text}`).join("\n\n");
  const hasRange = input.pageStart !== undefined || input.pageEnd !== undefined;
  if (hasRange && (input.pageStart === undefined || input.pageEnd === undefined)) throw new Error("حددوا أول وآخر صفحة معاً.");
  const fullText = file.extractedText?.trim() || indexedText.trim();
  if (!fullText && file.mimeType === "application/pdf") {
    const ocr = await ocrCompetitionPdf({ bytes: await downloadStudyFile(file), fileLabel: file.title, pageStart: input.pageStart, pageEnd: input.pageEnd });
    return appendSource({ engineId: input.engineId, sourceType: "study_file", sourceRefId: file.id, label: `${file.title} · OCR تلقائي`, sourceUrl: file.storageUrl, pageStart: input.pageStart, pageEnd: input.pageEnd, contentSnapshot: ocr.text, member: input.member });
  }
  if (!fullText) throw new Error("الكتاب ده مفيهوش نص جاهز للتحليل، وOCR التلقائي متاح لملفات PDF فقط.");
  if (!hasRange) return appendSource({ engineId: input.engineId, sourceType: "study_file", sourceRefId: file.id, label: file.title, sourceUrl: file.storageUrl, contentSnapshot: fullText, member: input.member });
  const range = await extractStudyFilePageRange({ fileId: file.id, pageStart: input.pageStart!, pageEnd: input.pageEnd! });
  return appendSource({ engineId: input.engineId, sourceType: "study_file", sourceRefId: file.id, label: `${file.title} — صفحات ${input.pageStart}–${input.pageEnd}`, sourceUrl: file.storageUrl, pageStart: input.pageStart, pageEnd: input.pageEnd, contentSnapshot: range.contentSnapshot, member: input.member });
}

function decodeCompetitionPdfUpload(dataBase64: string) {
  const match = dataBase64.match(/^data:application\/pdf;base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) throw new Error("ارفعوا ملف PDF صحيح فقط.");
  const bytes = Buffer.from(match[1].replace(/\s/g, ""), "base64");
  if (!bytes.length || bytes.length > MAX_COMPETITION_PDF_BYTES) throw new Error("كتاب المحرك لازم يكون PDF حتى 30 ميغابايت.");
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("الملف المرفوع ليس PDF صالحاً.");
  return bytes;
}

export async function addCompetitionUploadedPdfSource(input: { engineId: number; label?: string; fileName: string; dataBase64: string; pageStart?: number; pageEnd?: number; member: MemberSlot }) {
  await ensureDraftEngine(input.engineId);
  const hasRange = input.pageStart !== undefined || input.pageEnd !== undefined;
  if (hasRange && (input.pageStart === undefined || input.pageEnd === undefined)) throw new Error("حددوا أول وآخر صفحة معاً، أو اتركوا الاثنين فارغين لاستخدام النص المقروء من الكتاب.");
  const bytes = decodeCompetitionPdfUpload(input.dataBase64);
  const index = await extractPdfIndex(bytes);
  const saved = await storagePut(`competition-sources/${input.engineId}/books/${randomUUID()}-${safePdfName(input.fileName)}`, bytes, "application/pdf");
  const ocr = !index.pages.length || !index.text ? await ocrCompetitionPdf({ bytes, fileLabel: input.fileName, pageStart: input.pageStart, pageEnd: input.pageEnd }) : null;
  const contentSnapshot = ocr ? ocr.text : hasRange ? selectPdfPageRange(index.pages, input.pageStart!, input.pageEnd!) : index.text;
  if (contentSnapshot.length < 20) throw new Error("النطاق المختار ما فيهوش نص كفاية لتوليد أسئلة موثقة.");
  const label = input.label?.trim().slice(0, 300) || input.fileName.trim().slice(0, 300).replace(/\.pdf$/i, "") || "كتاب مرفوع";
  return appendSource({ engineId: input.engineId, sourceType: "study_file", label: `${hasRange ? `${label} — صفحات ${input.pageStart}–${input.pageEnd}` : label}${ocr ? " · OCR تلقائي" : ""}`, sourceUrl: saved.url, pageStart: input.pageStart, pageEnd: input.pageEnd, contentSnapshot, member: input.member });
}

function safePdfName(fileName: string) {
  return fileName.trim().slice(0, 240).replace(/[^a-zA-Z0-9._ -]/g, "") || "competition-book.pdf";
}

export async function searchCompetitionWebSources(query: string) {
  const result = await researchWeb(query.trim());
  return result.sources.map(source => ({ title: source.title, url: source.url, snippet: source.snippet, official: source.official }));
}

export async function addCompetitionWebSource(input: { engineId: number; query: string; sourceUrl: string; member: MemberSlot }) {
  const result = await researchWeb(input.query.trim());
  const source = result.sources.find(item => item.url === input.sourceUrl);
  if (!source?.content.trim()) throw new Error("المصدر المختار مش متاح حالياً للاستخراج الموثق. اختاروا نتيجة تانية أو جرّبوا البحث تاني.");
  return appendSource({ engineId: input.engineId, sourceType: "url", label: source.title, sourceUrl: source.url, contentSnapshot: source.content, member: input.member });
}

export async function addCompetitionImageSource(input: { engineId: number; label: string; imageName: string; mimeType: string; dataBase64: string; member: MemberSlot }) {
  await ensureDraftEngine(input.engineId);
  const ocr = await ocrCompetitionSourceImage({ engineId: input.engineId, imageName: input.imageName, mimeType: input.mimeType, dataBase64: input.dataBase64 });
  return appendSource({ engineId: input.engineId, sourceType: "image", label: input.label.trim() || input.imageName, sourceUrl: ocr.storageUrl, contentSnapshot: ocr.text, member: input.member });
}

export async function removeCompetitionEngineSource(input: { engineId: number; sourceId: number; member: MemberSlot }) {
  const db = await database();
  await ensureDraftEngine(input.engineId);
  await db.transaction(async tx => {
    const removed = (await tx.select({ isPrimary: competitionEngineSources.isPrimary }).from(competitionEngineSources).where(and(eq(competitionEngineSources.id, input.sourceId), eq(competitionEngineSources.engineId, input.engineId))).limit(1))[0];
    await tx.delete(competitionEngineSources).where(and(eq(competitionEngineSources.id, input.sourceId), eq(competitionEngineSources.engineId, input.engineId)));
    if (removed?.isPrimary) {
      const replacement = (await tx.select({ id: competitionEngineSources.id }).from(competitionEngineSources).where(eq(competitionEngineSources.engineId, input.engineId)).orderBy(desc(competitionEngineSources.createdAt)).limit(1))[0];
      if (replacement) await tx.update(competitionEngineSources).set({ isPrimary: true }).where(eq(competitionEngineSources.id, replacement.id));
    }
  });
  await db.update(competitionEngines).set({ updatedBy: input.member }).where(eq(competitionEngines.id, input.engineId));
  return getCompetitionEngine(input.engineId);
}

export async function setCompetitionPrimarySource(input: { engineId: number; sourceId: number; member: MemberSlot }) {
  const db = await database();
  await ensureDraftEngine(input.engineId);
  await db.transaction(async tx => {
    const source = (await tx.select({ id: competitionEngineSources.id }).from(competitionEngineSources).where(and(eq(competitionEngineSources.id, input.sourceId), eq(competitionEngineSources.engineId, input.engineId))).limit(1))[0];
    if (!source) throw new Error("المصدر ده مش تابع للمحرك المحدد.");
    await tx.update(competitionEngineSources).set({ isPrimary: false }).where(eq(competitionEngineSources.engineId, input.engineId));
    await tx.update(competitionEngineSources).set({ isPrimary: true }).where(eq(competitionEngineSources.id, source.id));
  });
  await db.update(competitionEngines).set({ updatedBy: input.member }).where(eq(competitionEngines.id, input.engineId));
  return getCompetitionEngine(input.engineId);
}

export async function deleteCompetitionEngine(input: { engineId: number; member: MemberSlot }) {
  const db = await database();
  await db.transaction(async tx => {
    const engine = (await tx.select({ id: competitionEngines.id }).from(competitionEngines).where(eq(competitionEngines.id, input.engineId)).limit(1))[0];
    if (!engine) throw new Error("محرك المنافسة مش موجود.");
    const matches = await tx.select({ status: competitionMatches.status }).from(competitionMatches).where(eq(competitionMatches.engineId, input.engineId));
    const hasActiveMatch = matches.some(match => ["waiting", "ready", "question_active", "evaluating", "showing_result"].includes(match.status));
    if (hasActiveMatch) throw new Error("المحرك مربوط بمباراة شغالة الآن. اخرجوا من الجولة أو أنهوها أولاً، وبعدها تقدروا تحذفوه مع بقاء النتيجة محفوظة.");
    const hasRecordedSession = matches.length > 0;
    if (!hasRecordedSession) {
      const sources = await tx.select({ id: competitionEngineSources.id }).from(competitionEngineSources).where(eq(competitionEngineSources.engineId, input.engineId));
      const sourceIds = sources.map(source => source.id);
      if (sourceIds.length) await tx.delete(competitionAutomaticWebResearches).where(inArray(competitionAutomaticWebResearches.sourceId, sourceIds));
      await tx.delete(competitionSourceInsights).where(eq(competitionSourceInsights.engineId, input.engineId));
      await tx.delete(competitionQuestions).where(eq(competitionQuestions.engineId, input.engineId));
      await tx.delete(competitionEngineSources).where(eq(competitionEngineSources.engineId, input.engineId));
    }
    await tx.delete(competitionEngines).where(eq(competitionEngines.id, input.engineId));
  });
}

export async function listCompetitionSourceOptions() {
  const db = await database();
  const [notes, files] = await Promise.all([
    db.select({ id: lessonNotes.id, label: lessonNotes.lessonTitle, subjectName: lessonNotes.subjectName }).from(lessonNotes).orderBy(desc(lessonNotes.updatedAt)),
    db.select({ id: studyFiles.id, label: studyFiles.title, subjectName: studyFiles.subjectName, pageCount: studyFiles.pageCount, hasPageIndex: sql<boolean>`CASE WHEN ${studyFiles.pageTextIndex} IS NULL OR CHAR_LENGTH(${studyFiles.pageTextIndex}) = 0 THEN FALSE ELSE TRUE END` }).from(studyFiles).where(eq(studyFiles.extractionStatus, "ready")).orderBy(desc(studyFiles.createdAt)),
  ]);
  return { notes, files };
}

import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { vocabularyProgress, vocabularyStudySessions, vocabularyWords } from "../drizzle/schema";
import { getStudyFileForAssistant } from "./workspaceContentDb";
import { invokeLLM } from "./_core/llm";

type MemberSlot = "saif" | "haneen";
type VocabularyLanguage = "english" | "arabic";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return db;
}

function normalizeWord(word: string) {
  return word.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ").slice(0, 240);
}

export async function listVocabulary(input: { member: MemberSlot; language?: VocabularyLanguage; subjectKey?: string }) {
  const db = await database();
  const words = await db.select().from(vocabularyWords).where(input.language ? eq(vocabularyWords.language, input.language) : undefined).orderBy(asc(vocabularyWords.unitName), asc(vocabularyWords.lessonTitle), asc(vocabularyWords.word));
  const progressRows = await db.select().from(vocabularyProgress).where(eq(vocabularyProgress.memberSlot, input.member));
  const progressByWord = new Map(progressRows.map(row => [row.wordId, row]));
  return words.filter(word => !input.subjectKey || word.subjectKey === input.subjectKey).map(word => ({ word, progress: progressByWord.get(word.id) ?? null }));
}

export async function listDueVocabulary(member: MemberSlot, language?: VocabularyLanguage) {
  const rows = await listVocabulary({ member, language });
  const now = Date.now();
  return rows.filter(row => !row.progress || row.progress.nextReviewAt.getTime() <= now);
}

export async function createVocabularyWord(input: { member: MemberSlot; language: VocabularyLanguage; word: string; meaning: string; pronunciation?: string; partOfSpeech?: string; sentence: string; example: string; relatedWords?: string[]; subjectKey?: string; subjectName?: string; bookTitle?: string; unitName?: string; lessonTitle?: string; pageNumber?: number; sourceFileId?: number }) {
  const db = await database();
  const word = input.word.trim().slice(0, 240);
  if (!word || !input.meaning.trim() || !input.sentence.trim()) throw new Error("الكلمة والمعنى والجملة حقول أساسية.");
  const result = await db.insert(vocabularyWords).values({ language: input.language, word, normalizedWord: normalizeWord(word), meaning: input.meaning.trim().slice(0, 2000), pronunciation: input.pronunciation?.trim().slice(0, 160) || null, partOfSpeech: input.partOfSpeech?.trim().slice(0, 80) || null, sentence: input.sentence.trim().slice(0, 4000), example: input.example.trim().slice(0, 4000), relatedWordsJson: JSON.stringify((input.relatedWords ?? []).slice(0, 12)), subjectKey: input.subjectKey?.trim().slice(0, 64) || null, subjectName: input.subjectName?.trim().slice(0, 120) || null, bookTitle: input.bookTitle?.trim().slice(0, 240) || null, unitName: input.unitName?.trim().slice(0, 180) || null, lessonTitle: input.lessonTitle?.trim().slice(0, 240) || null, pageNumber: input.pageNumber ?? null, sourceFileId: input.sourceFileId ?? null, createdBy: input.member, updatedBy: input.member });
  return Number((Array.isArray(result) ? result[0] : result)?.insertId ?? 0);
}

export async function recordVocabularyAnswer(input: { member: MemberSlot; wordId: number; correct: boolean; questionType: string }) {
  const db = await database();
  const existing = await db.select().from(vocabularyProgress).where(and(eq(vocabularyProgress.wordId, input.wordId), eq(vocabularyProgress.memberSlot, input.member))).limit(1);
  const previous = existing[0];
  const streak = input.correct ? (previous?.streak ?? 0) + 1 : 0;
  const intervalDays = input.correct ? Math.min(14, Math.max(1, streak)) : 0;
  const nextReviewAt = new Date(Date.now() + (input.correct ? intervalDays * 86_400_000 : 15 * 60_000));
  if (previous) {
    await db.update(vocabularyProgress).set({ correctCount: previous.correctCount + (input.correct ? 1 : 0), wrongCount: previous.wrongCount + (input.correct ? 0 : 1), streak, lastSeenAt: new Date(), nextReviewAt, lastQuestionType: input.questionType.slice(0, 32) }).where(eq(vocabularyProgress.id, previous.id));
    return { ...previous, correctCount: previous.correctCount + (input.correct ? 1 : 0), wrongCount: previous.wrongCount + (input.correct ? 0 : 1), streak, nextReviewAt };
  }
  await db.insert(vocabularyProgress).values({ wordId: input.wordId, memberSlot: input.member, correctCount: input.correct ? 1 : 0, wrongCount: input.correct ? 0 : 1, streak, lastSeenAt: new Date(), nextReviewAt, lastQuestionType: input.questionType.slice(0, 32) });
  return { wordId: input.wordId, memberSlot: input.member, correctCount: input.correct ? 1 : 0, wrongCount: input.correct ? 0 : 1, streak, nextReviewAt };
}

export async function getVocabularySummary(member: MemberSlot, language?: VocabularyLanguage) {
  const rows = await listVocabulary({ member, language });
  const due = rows.filter(row => !row.progress || row.progress.nextReviewAt.getTime() <= Date.now()).length;
  const mastered = rows.filter(row => { const progress = row.progress; if (!progress) return false; const total = progress.correctCount + progress.wrongCount; return total > 0 && progress.correctCount / total >= .85 && progress.streak >= 3; }).length;
  const weak = rows.filter(row => !row.progress || row.progress.correctCount <= row.progress.wrongCount).length;
  return { total: rows.length, due, mastered, weak };
}

export function vocabularyDifficulty(progress: { correctCount: number; wrongCount: number; streak: number } | null) {
  if (!progress || progress.correctCount === 0) return "very_weak" as const;
  const ratio = progress.correctCount / Math.max(1, progress.correctCount + progress.wrongCount);
  if (ratio >= .95 && progress.streak >= 5) return "rooted" as const;
  if (ratio >= .85) return "mastered" as const;
  if (ratio >= .65) return "good" as const;
  if (ratio >= .45) return "stabilizing" as const;
  return "needs_practice" as const;
}

export async function deleteVocabularyProgress(member: MemberSlot) {
  const db = await database();
  await db.delete(vocabularyProgress).where(eq(vocabularyProgress.memberSlot, member));
  return { success: true } as const;
}

type VocabularyCandidate = { word: string; meaning: string; pronunciation: string; partOfSpeech: string; sentence: string; example: string; relatedWords: string[]; pageNumber: number; confidence: "high" | "medium"; evidence: string };

function indexedPages(value: string | null) {
  if (!value) return [] as Array<{ pageNumber: number; text: string }>;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.flatMap(item => { if (!item || typeof item !== "object") return []; const page = item as { pageNumber?: unknown; text?: unknown }; return typeof page.pageNumber === "number" && typeof page.text === "string" ? [{ pageNumber: page.pageNumber, text: page.text }] : []; }) : [];
  } catch { return []; }
}

export async function suggestVocabularyFromFile(input: { fileId: number; language: VocabularyLanguage; unitName?: string; lessonTitle?: string; pageFrom?: number; pageTo?: number; maxCandidates: number }) {
  const file = await getStudyFileForAssistant(input.fileId);
  if (!file) throw new Error("الكتاب المطلوب مش موجود.");
  if (file.extractionStatus !== "ready") throw new Error("الكتاب لسه ما خلصش تجهيز النص. جرّب بعد ما حالة الكتاب تبقى جاهز.");
  const pages = indexedPages(file.pageTextIndex);
  const from = input.pageFrom ?? 1;
  const to = input.pageTo ?? file.pageCount ?? Number.MAX_SAFE_INTEGER;
  const source = (pages.length ? pages.filter(page => page.pageNumber >= from && page.pageNumber <= to) : file.extractedText && from === 1 ? [{ pageNumber: 1, text: file.extractedText }] : []).slice(0, 12);
  if (!source.length) throw new Error("مفيش نص مفهرس داخل نطاق الصفحات ده.");
  const text = source.map(page => `صفحة ${page.pageNumber}:\n${page.text.slice(0, 5500)}`).join("\n\n").slice(0, 50_000);
  if (!text.trim()) throw new Error("الكتاب لا يحتوي على نص قابل للاستخراج. لو هو صورة، ارفع نسخة نصية أو استخدم لقطة واضحة مع لؤي.");
  const languageInstruction = input.language === "english" ? "استخرج كلمات إنجليزية تعليمية، واكتب شرح معناها بالعربية مع نطقها." : "استخرج مفردات عربية تعليمية، واكتب شرحاً عربياً واضحاً ونطقاً مضبوطاً قدر الإمكان.";
  const response = await invokeLLM({ messages: [
    { role: "system", content: "أنت محرر قاموس منهجي دقيق. لا تخترع كلمة أو معنى خارج النص. استخرج فقط الكلمات المفيدة للتعلم من المقتطف، واجعل evidence اقتباساً حرفياً قصيراً من المصدر. لو لم تتأكد اترك confidence=medium ولا تضف تخميناً. أخرج JSON مطابقاً للمخطط فقط." },
    { role: "user", content: `${languageInstruction}\nاسم الكتاب: ${file.title}\nالوحدة المقترحة: ${input.unitName || "غير محددة"}\nالدرس المقترح: ${input.lessonTitle || "غير محدد"}\nعدد المرشحات الأقصى: ${input.maxCandidates}\n\nالنص المفهرس:\n${text}` },
  ], response_format: { type: "json_schema", json_schema: { name: "vocabulary_candidates", strict: true, schema: { type: "object", properties: { candidates: { type: "array", items: { type: "object", properties: { word: { type: "string" }, meaning: { type: "string" }, pronunciation: { type: "string" }, partOfSpeech: { type: "string" }, sentence: { type: "string" }, example: { type: "string" }, relatedWords: { type: "array", items: { type: "string" } }, pageNumber: { type: "integer" }, confidence: { type: "string", enum: ["high", "medium"] }, evidence: { type: "string" } }, required: ["word", "meaning", "pronunciation", "partOfSpeech", "sentence", "example", "relatedWords", "pageNumber", "confidence", "evidence"], additionalProperties: false } } }, required: ["candidates"], additionalProperties: false } } } });
  const raw = response.choices[0]?.message.content;
  if (typeof raw !== "string") throw new Error("لؤي ما رجعش مرشحات كلمات صالحة.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("نتيجة استخراج الكلمات غير مفهومة. جرّب الاستخراج مرة أخرى."); }
  const candidates = (parsed as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) throw new Error("نتيجة استخراج الكلمات ناقصة.");
  return candidates.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<VocabularyCandidate>;
    if (!candidate.word || !candidate.meaning || !candidate.sentence || !candidate.evidence || typeof candidate.pageNumber !== "number") return [];
    return [{ word: candidate.word.trim().slice(0, 240), meaning: candidate.meaning.trim().slice(0, 2000), pronunciation: (candidate.pronunciation || "").trim().slice(0, 160), partOfSpeech: (candidate.partOfSpeech || "").trim().slice(0, 80), sentence: candidate.sentence.trim().slice(0, 4000), example: (candidate.example || candidate.sentence).trim().slice(0, 4000), relatedWords: Array.isArray(candidate.relatedWords) ? candidate.relatedWords.filter(value => typeof value === "string").slice(0, 12) : [], pageNumber: Math.max(1, Math.round(candidate.pageNumber)), confidence: candidate.confidence === "high" ? "high" as const : "medium" as const, evidence: candidate.evidence.trim().slice(0, 700), fileId: file.id, fileTitle: file.title }];
  }).slice(0, input.maxCandidates);
}

export async function explainVocabularyWord(input: { word: string; meaning: string; sourceSentence?: string; language: VocabularyLanguage }) {
  const response = await invokeLLM({ messages: [
    { role: "system", content: "أنت لؤي، مساعد مفردات مصري لطيف. ساعد الطالب على تثبيت كلمة واحدة فقط. لا تغيّر معناها ولا تخترع معنى خارج المعطيات. اكتب جملة إنجليزية طبيعية قصيرة تحتوي الكلمة، ترجمتها العربية، رابطاً ذهنياً بسيطاً بالمصري، ونطقاً مقطعياً تقريبياً. أخرج JSON فقط." },
    { role: "user", content: `الكلمة: ${input.word}\nالمعنى المعتمد: ${input.meaning}\nجملة المصدر: ${input.sourceSentence || "غير متاحة"}\nاللغة: ${input.language}` },
  ], response_format: { type: "json_schema", json_schema: { name: "vocabulary_ai_help", strict: true, schema: { type: "object", properties: { sentence: { type: "string" }, translation: { type: "string" }, memoryHook: { type: "string" }, syllablePronunciation: { type: "string" } }, required: ["sentence", "translation", "memoryHook", "syllablePronunciation"], additionalProperties: false } } } });
  const raw = response.choices[0]?.message.content;
  if (typeof raw !== "string") throw new Error("لؤي مش قادر يجهز مساعدة للكلمة دلوقتي.");
  try { const parsed = JSON.parse(raw) as Record<string, unknown>; if (!["sentence", "translation", "memoryHook", "syllablePronunciation"].every(key => typeof parsed[key] === "string" && String(parsed[key]).trim())) throw new Error("invalid"); return { sentence: String(parsed.sentence).slice(0, 500), translation: String(parsed.translation).slice(0, 500), memoryHook: String(parsed.memoryHook).slice(0, 700), syllablePronunciation: String(parsed.syllablePronunciation).slice(0, 200) }; } catch { throw new Error("نتيجة لؤي غير صالحة. جرّب زر المساعدة مرة تانية."); }
}

export type VocabularySessionWord = VocabularyCandidate & { id: string; state: "transfer" | "recall" | "mastered"; transferCount: number; fileId: number; fileTitle: string };
export type VocabularySession = { id: number; memberSlot: MemberSlot; bookId: number; pageFrom: number; pageTo: number; language: VocabularyLanguage; extractedWords: VocabularySessionWord[]; currentWordIndex: number; wordStates: Record<string, VocabularySessionWord["state"]>; reviewQueue: string[]; reviewCount: number; masteredCount: number; status: "active" | "completed" | "abandoned"; bookTitle?: string; updatedAt: Date };

function shuffle<T>(values: T[]) { const copy = [...values]; for (let index = copy.length - 1; index > 0; index--) { const target = Math.floor(Math.random() * (index + 1)); [copy[index], copy[target]] = [copy[target]!, copy[index]!]; } return copy; }
function sessionFromRow(row: typeof vocabularyStudySessions.$inferSelect, bookTitle?: string): VocabularySession { const extractedWords = JSON.parse(row.extractedWordsJson) as VocabularySessionWord[]; return { id: row.id, memberSlot: row.memberSlot, bookId: row.bookId, pageFrom: row.pageFrom, pageTo: row.pageTo, language: row.language, extractedWords, currentWordIndex: row.currentWordIndex, wordStates: JSON.parse(row.wordStatesJson) as Record<string, VocabularySessionWord["state"]>, reviewQueue: JSON.parse(row.reviewQueueJson) as string[], reviewCount: row.reviewCount, masteredCount: row.masteredCount, status: row.status, bookTitle, updatedAt: row.updatedAt }; }

export async function createVocabularyStudySession(input: { member: MemberSlot; bookId: number; pageFrom: number; pageTo: number; language: VocabularyLanguage }) {
  if (input.pageFrom < 1 || input.pageTo < input.pageFrom || input.pageTo - input.pageFrom > 100) throw new Error("اختاروا نطاق صفحات صحيحاً بحد أقصى 100 صفحة.");
  const db = await database();
  const candidates = await suggestVocabularyFromFile({ fileId: input.bookId, pageFrom: input.pageFrom, pageTo: input.pageTo, language: input.language, maxCandidates: 20 });
  if (!candidates.length) throw new Error("ملقيناش كلمات مناسبة في الصفحات المحددة.");
  const extractedWords = shuffle(candidates).map((word, index) => ({ ...word, id: `${Date.now()}-${index}-${word.word}`, state: "transfer" as const, transferCount: 0 }));
  const wordStates = Object.fromEntries(extractedWords.map(word => [word.id, "transfer"]));
  const result = await db.insert(vocabularyStudySessions).values({ memberSlot: input.member, bookId: input.bookId, pageFrom: input.pageFrom, pageTo: input.pageTo, language: input.language, extractedWordsJson: JSON.stringify(extractedWords), currentWordIndex: 0, wordStatesJson: JSON.stringify(wordStates), reviewQueueJson: JSON.stringify([]), reviewCount: 0, masteredCount: 0 });
  const id = Number((Array.isArray(result) ? result[0] : result)?.insertId ?? 0);
  const [row] = await db.select().from(vocabularyStudySessions).where(eq(vocabularyStudySessions.id, id)).limit(1);
  return row ? sessionFromRow(row) : { id, memberSlot: input.member, bookId: input.bookId, pageFrom: input.pageFrom, pageTo: input.pageTo, language: input.language, extractedWords, currentWordIndex: 0, wordStates, reviewQueue: [], reviewCount: 0, masteredCount: 0, status: "active" as const, updatedAt: new Date() };
}

export async function getLatestVocabularyStudySession(member: MemberSlot) {
  const db = await database();
  const [row] = await db.select().from(vocabularyStudySessions).where(and(eq(vocabularyStudySessions.memberSlot, member), eq(vocabularyStudySessions.status, "active"))).orderBy(desc(vocabularyStudySessions.updatedAt)).limit(1);
  return row ? sessionFromRow(row) : null;
}

export async function saveVocabularyStudySessionState(input: { member: MemberSlot; sessionId: number; currentWordIndex: number; wordStates: Record<string, VocabularySessionWord["state"]>; reviewQueue: string[]; reviewCount: number; masteredCount: number; status?: "active" | "completed" }) {
  const db = await database();
  const [row] = await db.select().from(vocabularyStudySessions).where(and(eq(vocabularyStudySessions.id, input.sessionId), eq(vocabularyStudySessions.memberSlot, input.member))).limit(1);
  if (!row) throw new Error("جلسة الكلمات مش موجودة أو مش تخص المستخدم الحالي.");
  await db.update(vocabularyStudySessions).set({ currentWordIndex: Math.max(0, input.currentWordIndex), wordStatesJson: JSON.stringify(input.wordStates), reviewQueueJson: JSON.stringify(input.reviewQueue), reviewCount: Math.max(0, input.reviewCount), masteredCount: Math.max(0, input.masteredCount), status: input.status ?? "active", completedAt: input.status === "completed" ? new Date() : null }).where(eq(vocabularyStudySessions.id, input.sessionId));
  const [updated] = await db.select().from(vocabularyStudySessions).where(eq(vocabularyStudySessions.id, input.sessionId)).limit(1);
  return updated ? sessionFromRow(updated) : null;
}

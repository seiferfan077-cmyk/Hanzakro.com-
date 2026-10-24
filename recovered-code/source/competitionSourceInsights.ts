import { asc, eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { competitionEngineSources, competitionSourceInsights } from "../drizzle/schema";
import { getDb } from "./db";
import { getCompetitionEngine } from "./competitionEngineDb";
import type { MemberSlot } from "./workspaceAccess";

type InsightTopic = { title: string; evidenceQuote: string };
type InsightConcept = { term: string; explanation: string; evidenceQuote: string };
type SourceInsight = { sourceId: number; sourceLabel: string; topics: InsightTopic[]; concepts: InsightConcept[]; updatedAt: Date };

const insightSchema = {
  type: "object",
  properties: {
    topics: { type: "array", maxItems: 6, items: { type: "object", properties: { title: { type: "string", minLength: 2, maxLength: 180 }, evidenceQuote: { type: "string", minLength: 8, maxLength: 600 } }, required: ["title", "evidenceQuote"], additionalProperties: false } },
    concepts: { type: "array", maxItems: 10, items: { type: "object", properties: { term: { type: "string", minLength: 2, maxLength: 160 }, explanation: { type: "string", minLength: 4, maxLength: 800 }, evidenceQuote: { type: "string", minLength: 8, maxLength: 600 } }, required: ["term", "explanation", "evidenceQuote"], additionalProperties: false } },
  },
  required: ["topics", "concepts"],
  additionalProperties: false,
};

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return db;
}

function cleanQuote(value: string) { return value.replace(/\s+/g, " ").trim(); }
function hasEvidence(snapshot: string, quote: string) { return snapshot.replace(/\s+/g, " ").includes(cleanQuote(quote)); }

function fallbackInsight(source: { id: number; label: string; contentSnapshot: string }) {
  const sentences = source.contentSnapshot.replace(/\s+/g, " ").split(/[.!؟?؛;]+/).map(sentence => sentence.trim()).filter(sentence => sentence.length >= 12).filter((sentence, index, all) => all.indexOf(sentence) === index).slice(0, 6);
  return {
    sourceId: source.id,
    topics: sentences.map(sentence => ({ title: sentence.slice(0, 180), evidenceQuote: sentence.slice(0, 600) })),
    concepts: sentences.slice(0, 6).map(sentence => ({ term: sentence.split(" ").slice(0, 5).join(" ").slice(0, 160), explanation: "فكرة ظاهرة في النص الأصلي، وتحتاج مراجعة لؤي عند توفر التحليل المتقدم.", evidenceQuote: sentence.slice(0, 600) })),
  };
}

function validateInsight(source: { id: number; label: string; contentSnapshot: string }, raw: { topics?: InsightTopic[]; concepts?: InsightConcept[] }) {
  const topics = (raw.topics ?? []).filter(topic => topic.title?.trim() && topic.evidenceQuote?.trim() && hasEvidence(source.contentSnapshot, topic.evidenceQuote)).map(topic => ({ title: topic.title.trim().slice(0, 180), evidenceQuote: cleanQuote(topic.evidenceQuote).slice(0, 600) }));
  const concepts = (raw.concepts ?? []).filter(concept => concept.term?.trim() && concept.explanation?.trim() && concept.evidenceQuote?.trim() && hasEvidence(source.contentSnapshot, concept.evidenceQuote)).map(concept => ({ term: concept.term.trim().slice(0, 160), explanation: concept.explanation.trim().slice(0, 800), evidenceQuote: cleanQuote(concept.evidenceQuote).slice(0, 600) }));
  return { topics, concepts };
}

export async function analyzeCompetitionEngineSources(input: { engineId: number; member: MemberSlot }) {
  const engine = await getCompetitionEngine(input.engineId);
  if (!engine) throw new Error("محرك المنافسة مش موجود.");
  if (!engine.sources.length) throw new Error("ضيفوا مصدراً واحداً على الأقل قبل تحليل المحتوى.");
  const analyzed: Array<{ sourceId: number; topics: InsightTopic[]; concepts: InsightConcept[] }> = [];
  for (const source of engine.sources) {
    try {
      const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 2500,
      responseFormat: { type: "json_schema", json_schema: { name: "competition_source_insight", strict: true, schema: insightSchema } },
      messages: [
        { role: "system", content: "أنت تحلل مادة دراسية. استخرج فقط الموضوعات والمفاهيم الظاهرة صراحة في النص المعطى. كل عنصر يلزم أن يحمل اقتباساً حرفياً قصيراً من النص يثبت وجوده. لا تضف معرفة خارج النص، ولا تخترع عناوين أو تعريفات. إن لم تجد مفاهيم كافية فأرجع قائمة أقصر." },
        { role: "user", content: `سياق المحرك: ${[engine.subjectName, engine.gradeLevel, engine.unitName, engine.lessonTitle].filter(Boolean).join(" — ") || engine.title}\nالمصدر: ${source.label}\n\nنص المصدر فقط:\n${source.contentSnapshot.slice(0, 20000)}` },
      ],
      });
      const content = response.choices[0]?.message.content;
      if (typeof content !== "string") throw new Error("رد غير قابل للقراءة");
      const validated = validateInsight(source, JSON.parse(content) as { topics?: InsightTopic[]; concepts?: InsightConcept[] });
      const fallback = fallbackInsight(source);
      analyzed.push({ sourceId: source.id, topics: validated.topics.length ? validated.topics : fallback.topics, concepts: validated.concepts.length ? validated.concepts : fallback.concepts });
    } catch {
      analyzed.push(fallbackInsight(source));
    }
  }
  const db = await database();
  await db.transaction(async tx => {
    for (const insight of analyzed) {
      await tx.insert(competitionSourceInsights).values({ engineId: input.engineId, sourceId: insight.sourceId, topicsJson: JSON.stringify(insight.topics), conceptsJson: JSON.stringify(insight.concepts) }).onDuplicateKeyUpdate({ set: { topicsJson: JSON.stringify(insight.topics), conceptsJson: JSON.stringify(insight.concepts) } });
    }
  });
  return getCompetitionSourceInsights(input.engineId);
}

export async function getCompetitionSourceInsights(engineId: number): Promise<SourceInsight[]> {
  const db = await database();
  const [rows, sources] = await Promise.all([
    db.select().from(competitionSourceInsights).where(eq(competitionSourceInsights.engineId, engineId)).orderBy(asc(competitionSourceInsights.sourceId)),
    db.select().from(competitionEngineSources).where(eq(competitionEngineSources.engineId, engineId)),
  ]);
  return rows.map(row => {
    const source = sources.find(item => item.id === row.sourceId);
    return { sourceId: row.sourceId, sourceLabel: source?.label ?? "مصدر محفوظ", topics: JSON.parse(row.topicsJson) as InsightTopic[], concepts: JSON.parse(row.conceptsJson) as InsightConcept[], updatedAt: row.updatedAt };
  });
}

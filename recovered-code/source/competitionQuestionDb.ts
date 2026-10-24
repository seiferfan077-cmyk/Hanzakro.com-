import { asc, eq } from "drizzle-orm";
import { competitionEngineSources, competitionEngines, competitionQuestions } from "../drizzle/schema";
import { getDb } from "./db";
import type { PreparedCompetitionQuestion } from "./competitionQuestionTypes";
import type { MemberSlot } from "./workspaceAccess";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return db;
}

export async function getCompetitionEngineForQuestions(engineId: number) {
  const db = await database();
  const engine = (await db.select().from(competitionEngines).where(eq(competitionEngines.id, engineId)).limit(1))[0];
  if (!engine) throw new Error("محرك المنافسة مش موجود.");
  const sources = await db.select().from(competitionEngineSources).where(eq(competitionEngineSources.engineId, engineId)).orderBy(asc(competitionEngineSources.createdAt));
  return { engine, sources };
}

export async function listCompetitionQuestions(engineId: number) {
  const db = await database();
  const rows = await db.select().from(competitionQuestions).where(eq(competitionQuestions.engineId, engineId)).orderBy(asc(competitionQuestions.createdAt), asc(competitionQuestions.id));
  return rows.map(row => ({
    ...row,
    options: JSON.parse(row.optionsJson) as string[],
    answer: JSON.parse(row.answerJson) as { canonicalAnswer: string },
    quality: JSON.parse(row.qualityJson) as { questionClear: boolean; oneVerifiableAnswer: boolean; referenceIsSufficient: boolean },
  }));
}

export async function saveValidatedCompetitionQuestions(input: { engineId: number; questions: PreparedCompetitionQuestion[]; member: MemberSlot }) {
  const db = await database();
  const { engine } = await getCompetitionEngineForQuestions(input.engineId);
  if (engine.status !== "draft") throw new Error("المحرك ده اتقفل بعد تجهيزه.");
  if (!input.questions.length) throw new Error("لم يتم العثور على سؤال موثوق يمكن حفظه من المصادر الحالية.");

  await db.transaction(async tx => {
    await tx.delete(competitionQuestions).where(eq(competitionQuestions.engineId, input.engineId));
    await tx.insert(competitionQuestions).values(input.questions.map(question => ({
      engineId: input.engineId,
      sourceId: question.sourceId,
      questionType: question.questionType,
      prompt: question.prompt,
      optionsJson: JSON.stringify(question.options),
      answerJson: JSON.stringify({ canonicalAnswer: question.answer }),
      explanation: question.explanation,
      evidenceQuote: question.evidenceQuote,
      difficulty: question.difficulty,
      qualityJson: JSON.stringify(question.quality),
      status: "validated" as const,
      createdBy: input.member,
    })));
    await tx.update(competitionEngines).set({ questionCount: input.questions.length, status: "draft", updatedBy: input.member }).where(eq(competitionEngines.id, input.engineId));
  });

  return { questions: await listCompetitionQuestions(input.engineId), requestedCount: engine.questionCount, acceptedCount: input.questions.length, partial: input.questions.length < engine.questionCount };
}

export async function confirmCompetitionQuestionBank(input: { engineId: number; member: MemberSlot }) {
  const db = await database();
  const { engine } = await getCompetitionEngineForQuestions(input.engineId);
  if (engine.status !== "draft") throw new Error("بنك الأسئلة اتقفل بالفعل.");
  const questions = await db.select({ id: competitionQuestions.id }).from(competitionQuestions).where(eq(competitionQuestions.engineId, input.engineId));
  if (!questions.length) throw new Error("راجعوا أو ولّدوا سؤالاً موثوقاً واحداً على الأقل قبل إغلاق البنك.");
  await db.update(competitionEngines).set({ questionCount: questions.length, status: "ready", updatedBy: input.member }).where(eq(competitionEngines.id, input.engineId));
  return getCompetitionEngineForQuestions(input.engineId);
}

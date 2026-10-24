import { eq, inArray } from "drizzle-orm";
import { competitionEngines, competitionMatchAnswers, competitionMatchEvaluations, competitionMatchQuestions, competitionMatchResults, competitionMatches, competitionQuestions } from "../drizzle/schema";
import { getDb } from "./db";
import type { MemberSlot } from "./workspaceAccess";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return db;
}

type PlayerStats = { evaluated: number; correct: number; partial: number; incorrect: number; manualReview: number; accuracy: number; averageResponseSeconds: number | null };

export async function getCompetitionStats() {
  const db = await database();
  const matches = await db.select().from(competitionMatches).where(eq(competitionMatches.mode, "duel"));
  const matchIds = matches.map(match => match.id);
  if (!matchIds.length) return { completedMatches: 0, players: { saif: emptyPlayerStats(), haneen: emptyPlayerStats() }, subjects: [] as Array<{ subjectName: string; evaluated: number; correct: number; accuracy: number }> };
  const results = await db.select().from(competitionMatchResults).where(inArray(competitionMatchResults.matchId, matchIds));
  if (!results.length) return { completedMatches: 0, players: { saif: emptyPlayerStats(), haneen: emptyPlayerStats() }, subjects: [] as Array<{ subjectName: string; evaluated: number; correct: number; accuracy: number }> };
  const engineIds = Array.from(new Set(matches.map(match => match.engineId)));
  const [matchQuestions, evaluations, answers, questions, engines] = await Promise.all([
    db.select().from(competitionMatchQuestions).where(inArray(competitionMatchQuestions.matchId, matchIds)),
    db.select().from(competitionMatchEvaluations).where(inArray(competitionMatchEvaluations.matchId, matchIds)),
    db.select().from(competitionMatchAnswers).where(inArray(competitionMatchAnswers.matchId, matchIds)),
    db.select().from(competitionQuestions),
    db.select().from(competitionEngines).where(inArray(competitionEngines.id, engineIds)),
  ]);
  const players: Record<MemberSlot, PlayerStats> = { saif: emptyPlayerStats(), haneen: emptyPlayerStats() };
  const subjectMap = new Map<string, { evaluated: number; correct: number }>();
  for (const evaluation of evaluations) {
    const player = players[evaluation.memberSlot as MemberSlot];
    player.evaluated += 1;
    if (evaluation.outcome === "correct") player.correct += 1;
    if (evaluation.outcome === "partial") player.partial += 1;
    if (evaluation.outcome === "incorrect") player.incorrect += 1;
    if (evaluation.outcome === "manual_review") player.manualReview += 1;
    const matchQuestion = matchQuestions.find(item => item.id === evaluation.matchQuestionId);
    const match = matchQuestion ? matches.find(item => item.id === matchQuestion.matchId) : undefined;
    const engine = match ? engines.find(item => item.id === match.engineId) : undefined;
    const subjectName = (match?.engineSubjectNameSnapshot ?? engine?.subjectName) || "مادة غير محددة";
    const subject = subjectMap.get(subjectName) ?? { evaluated: 0, correct: 0 };
    subject.evaluated += 1;
    if (evaluation.outcome === "correct") subject.correct += 1;
    subjectMap.set(subjectName, subject);
  }
  for (const answer of answers) {
    const matchQuestion = matchQuestions.find(item => item.id === answer.matchQuestionId);
    if (!matchQuestion?.activatedAt) continue;
    const elapsed = Math.max(0, Math.round((answer.submittedAt.getTime() - matchQuestion.activatedAt.getTime()) / 1000));
    const player = players[answer.memberSlot as MemberSlot] as PlayerStats & { responseSamples?: number[] };
    player.responseSamples = [...(player.responseSamples ?? []), elapsed];
  }
  (Object.keys(players) as MemberSlot[]).forEach(slot => {
    const player = players[slot] as PlayerStats & { responseSamples?: number[] };
    player.accuracy = player.evaluated ? Math.round((player.correct / player.evaluated) * 100) : 0;
    player.averageResponseSeconds = player.responseSamples?.length ? Math.round(player.responseSamples.reduce((sum, value) => sum + value, 0) / player.responseSamples.length) : null;
    delete player.responseSamples;
  });
  return { completedMatches: results.length, players, subjects: Array.from(subjectMap.entries()).map(([subjectName, value]) => ({ subjectName, ...value, accuracy: value.evaluated ? Math.round((value.correct / value.evaluated) * 100) : 0 })).sort((left, right) => right.evaluated - left.evaluated) };
}

function emptyPlayerStats(): PlayerStats {
  return { evaluated: 0, correct: 0, partial: 0, incorrect: 0, manualReview: 0, accuracy: 0, averageResponseSeconds: null };
}

import { desc, eq, inArray } from "drizzle-orm";
import { competitionEngines, competitionMatchAnswers, competitionMatchPlayers, competitionMatchResults, competitionMatches } from "../drizzle/schema";
import { getDb } from "./db";
import type { MemberSlot } from "./workspaceAccess";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return db;
}

const COMPETITION_TIMEOUT_ANSWER = "__competition_timeout__";

export async function getCompetitionHistory() {
  const db = await database();
  const matches = await db.select().from(competitionMatches).orderBy(desc(competitionMatches.finishedAt)).limit(36);
  const matchIds = matches.map(match => match.id);
  const results = matchIds.length ? await db.select().from(competitionMatchResults).where(inArray(competitionMatchResults.matchId, matchIds)).orderBy(desc(competitionMatchResults.finishedAt)) : [];
  const engineIds = Array.from(new Set(matches.map(match => match.engineId)));
  const [engines, players, timeoutAnswers] = await Promise.all([
    engineIds.length ? db.select().from(competitionEngines).where(inArray(competitionEngines.id, engineIds)) : Promise.resolve([]),
    matchIds.length ? db.select().from(competitionMatchPlayers).where(inArray(competitionMatchPlayers.matchId, matchIds)) : Promise.resolve([]),
    matchIds.length ? db.select({ matchId: competitionMatchAnswers.matchId, answerText: competitionMatchAnswers.answerText }).from(competitionMatchAnswers).where(inArray(competitionMatchAnswers.matchId, matchIds)) : Promise.resolve([]),
  ]);
  const timeoutCountByMatch = new Map<number, number>();
  timeoutAnswers.forEach(answer => { if (answer.answerText === COMPETITION_TIMEOUT_ANSWER) timeoutCountByMatch.set(answer.matchId, (timeoutCountByMatch.get(answer.matchId) ?? 0) + 1); });
  const timedOutSessionCount = Array.from(timeoutCountByMatch.values()).filter(count => count > 0).length;
  const duelResults = results.filter(result => matches.find(match => match.id === result.matchId)?.mode === "duel");
  const wins: Record<MemberSlot, number> = { saif: 0, haneen: 0 };
  duelResults.forEach(result => { if (result.winnerSlot) wins[result.winnerSlot as MemberSlot] += 1; });
  return {
    wins,
    completedCount: duelResults.length,
    sessionCount: results.length,
    timedOutSessionCount,
    items: duelResults.map(result => {
      const match = matches.find(item => item.id === result.matchId);
      const engine = match ? engines.find(item => item.id === match.engineId) : null;
      return { id: result.id, matchId: result.matchId, winnerSlot: result.winnerSlot, saifPoints: result.saifPoints, haneenPoints: result.haneenPoints, finishedAt: result.finishedAt, engineTitle: match?.engineTitleSnapshot ?? engine?.title ?? "محرك محذوف" };
    }),
    sessionItems: results.map(result => {
      const match = matches.find(item => item.id === result.matchId);
      const engine = match ? engines.find(item => item.id === match.engineId) : null;
      const matchPlayers = players.filter(player => player.matchId === result.matchId).map(player => player.memberSlot as MemberSlot);
      const human = matchPlayers[0] ?? match?.createdBy ?? "saif";
      const participants = match?.mode === "rashed" ? [human, "rashed"] : matchPlayers;
      const winnerKey = result.winnerKey as MemberSlot | "rashed" | null;
      const loserKey = winnerKey ? participants.find(participant => participant !== winnerKey) ?? null : null;
      return { id: result.id, matchId: result.matchId, engineTitle: match?.engineTitleSnapshot ?? engine?.title ?? "محرك محذوف", mode: match?.mode ?? "duel", participants, winnerKey, loserKey, completionReason: result.completionReason, forfeitedBy: result.forfeitedBy as MemberSlot | null, timedOutQuestionCount: timeoutCountByMatch.get(result.matchId) ?? 0, saifPoints: result.saifPoints, haneenPoints: result.haneenPoints, rashedPoints: result.rashedPoints, finishedAt: result.finishedAt };
    }),
  };
}

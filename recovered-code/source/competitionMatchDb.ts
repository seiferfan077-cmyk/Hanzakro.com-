import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { competitionEngineSources, competitionEngines, competitionLoayRoundReviews, competitionMatchAnswers, competitionMatchEvaluations, competitionMatchPlayers, competitionMatchQuestions, competitionMatchRationales, competitionMatchResults, competitionMatches, competitionQuestions, competitionRashedTurns, competitionScoreLedger } from "../drizzle/schema";
import { getDb } from "./db";
import { getCompetitionEngineForQuestions } from "./competitionQuestionDb";
import { evaluateCompetitionQuestion } from "./competitionEvaluation";
import { generateRashedReply } from "./competitionRashed";
import type { MemberSlot } from "./workspaceAccess";

const activeMatchStatuses = ["waiting", "ready", "question_active", "evaluating", "showing_result"] as const;
const engagedPlayerStates = ["joined", "ready", "disconnected"] as const;
export const COMPETITION_TIMEOUT_ANSWER = "__competition_timeout__";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return db;
}

async function requirePlayer(matchId: number, member: MemberSlot) {
  const db = await database();
  const player = (await db.select().from(competitionMatchPlayers).where(and(eq(competitionMatchPlayers.matchId, matchId), eq(competitionMatchPlayers.memberSlot, member))).limit(1))[0];
  if (!player) throw new Error("العضو ده مش مشارك في المباراة دي.");
  return player;
}

async function getMatchRecord(matchId: number) {
  const db = await database();
  const match = (await db.select().from(competitionMatches).where(eq(competitionMatches.id, matchId)).limit(1))[0];
  if (!match) throw new Error("المباراة مش موجودة.");
  return match;
}

const deadlineFor = (activatedAt: Date, timeLimitSeconds: number) => timeLimitSeconds > 0 ? new Date(activatedAt.getTime() + timeLimitSeconds * 1000) : null;

export async function settleCompetitionQuestionDeadline(matchId: number) {
  const db = await database();
  const now = new Date();
  const settled = await db.transaction(async tx => {
    const match = (await tx.select().from(competitionMatches).where(and(eq(competitionMatches.id, matchId), eq(competitionMatches.status, "question_active"))).limit(1))[0];
    if (!match) return false;
    const question = (await tx.select().from(competitionMatchQuestions).where(and(eq(competitionMatchQuestions.matchId, matchId), eq(competitionMatchQuestions.questionOrder, match.currentQuestionOrder), eq(competitionMatchQuestions.status, "active"))).limit(1))[0];
    if (!question?.deadlineAt || question.deadlineAt.getTime() > now.getTime()) return false;
    const locked = await tx.execute(sql`SELECT id FROM competitionMatchQuestions WHERE id = ${question.id} AND status = 'active' AND deadlineAt <= ${now} FOR UPDATE`);
    if (!locked[0]) return false;
    const players = await tx.select({ memberSlot: competitionMatchPlayers.memberSlot }).from(competitionMatchPlayers).where(eq(competitionMatchPlayers.matchId, matchId));
    const answers = await tx.select({ memberSlot: competitionMatchAnswers.memberSlot }).from(competitionMatchAnswers).where(eq(competitionMatchAnswers.matchQuestionId, question.id));
    const missing = players.filter(player => !answers.some(answer => answer.memberSlot === player.memberSlot));
    if (missing.length) await tx.insert(competitionMatchAnswers).values(missing.map(player => ({ matchId, matchQuestionId: question.id, memberSlot: player.memberSlot, answerText: COMPETITION_TIMEOUT_ANSWER, idempotencyKey: `competition-timeout:${matchId}:${question.id}:${player.memberSlot}` })));
    await tx.update(competitionMatchQuestions).set({ status: "answered", answeredAt: now }).where(and(eq(competitionMatchQuestions.id, question.id), eq(competitionMatchQuestions.status, "active")));
    await tx.update(competitionMatches).set({ status: "evaluating", stateVersion: match.stateVersion + 1 }).where(and(eq(competitionMatches.id, matchId), eq(competitionMatches.status, "question_active")));
    return true;
  });
  if (settled) await evaluateCompetitionQuestion(matchId);
  return settled;
}

async function touchCompetitionPresence(matchId: number, member: MemberSlot) {
  const db = await database();
  const match = await getMatchRecord(matchId);
  const player = await requirePlayer(matchId, member);
  const now = new Date();
  const resumedState = player.state === "disconnected" ? (["question_active", "evaluating", "showing_result"].includes(match.status) ? "ready" : "joined") : player.state;
  await db.update(competitionMatchPlayers).set({ state: resumedState, lastSeenAt: now, disconnectedAt: null }).where(eq(competitionMatchPlayers.id, player.id));
  const staleBefore = new Date(now.getTime() - 20_000);
  await db.update(competitionMatchPlayers).set({ state: "disconnected", disconnectedAt: now }).where(and(eq(competitionMatchPlayers.matchId, matchId), inArray(competitionMatchPlayers.state, ["joined", "ready"]), lt(competitionMatchPlayers.lastSeenAt, staleBefore)));
}

export async function getCompetitionMatch(matchId: number, member: MemberSlot) {
  const db = await database();
  await requirePlayer(matchId, member);
  await settleCompetitionQuestionDeadline(matchId);
  const match = await getMatchRecord(matchId);
  const players = await db.select().from(competitionMatchPlayers).where(eq(competitionMatchPlayers.matchId, matchId)).orderBy(asc(competitionMatchPlayers.memberSlot));
  const matchQuestions = await db.select().from(competitionMatchQuestions).where(eq(competitionMatchQuestions.matchId, matchId)).orderBy(asc(competitionMatchQuestions.questionOrder));
  const current = matchQuestions.find(question => question.questionOrder === match.currentQuestionOrder) ?? null;
  const question = current ? (await db.select({ id: competitionQuestions.id, questionType: competitionQuestions.questionType, prompt: competitionQuestions.prompt, optionsJson: competitionQuestions.optionsJson, difficulty: competitionQuestions.difficulty, sourceType: competitionEngineSources.sourceType, sourceUrl: competitionEngineSources.sourceUrl }).from(competitionQuestions).leftJoin(competitionEngineSources, eq(competitionQuestions.sourceId, competitionEngineSources.id)).where(eq(competitionQuestions.id, current.questionId)).limit(1))[0] : null;
  const answers = current ? await db.select({ memberSlot: competitionMatchAnswers.memberSlot }).from(competitionMatchAnswers).where(eq(competitionMatchAnswers.matchQuestionId, current.id)) : [];
  const evaluations = current && ["showing_result", "finished"].includes(match.status) ? await db.select({ id: competitionMatchEvaluations.id, memberSlot: competitionMatchEvaluations.memberSlot, outcome: competitionMatchEvaluations.outcome, confidence: competitionMatchEvaluations.confidence, awardedPoints: competitionMatchEvaluations.awardedPoints, reason: competitionMatchEvaluations.reason, reviewProposedOutcome: competitionMatchEvaluations.reviewProposedOutcome, reviewConfirmedBy: competitionMatchEvaluations.reviewConfirmedBy, reviewNote: competitionMatchEvaluations.reviewNote }).from(competitionMatchEvaluations).where(eq(competitionMatchEvaluations.matchQuestionId, current.id)) : [];
  const rashedTurn = current && match.mode === "rashed" ? (await db.select().from(competitionRashedTurns).where(eq(competitionRashedTurns.matchQuestionId, current.id)).limit(1))[0] ?? null : null;
  const rationales = current && ["showing_result", "finished"].includes(match.status) ? await db.select({ authorKey: competitionMatchRationales.authorKey, content: competitionMatchRationales.content, updatedAt: competitionMatchRationales.updatedAt }).from(competitionMatchRationales).where(eq(competitionMatchRationales.matchQuestionId, current.id)).orderBy(asc(competitionMatchRationales.id)) : [];
  const loayReview = current && ["showing_result", "finished"].includes(match.status) ? (await db.select({ reviewText: competitionLoayRoundReviews.reviewText, createdAt: competitionLoayRoundReviews.createdAt }).from(competitionLoayRoundReviews).where(eq(competitionLoayRoundReviews.matchQuestionId, current.id)).limit(1))[0] ?? null : null;
  const scoreRows = await db.select({ memberSlot: competitionScoreLedger.memberSlot, points: competitionScoreLedger.points }).from(competitionScoreLedger).where(eq(competitionScoreLedger.matchId, matchId));
  const scores: Record<MemberSlot, number> = { saif: 0, haneen: 0 };
  scoreRows.forEach(row => { scores[row.memberSlot as MemberSlot] += row.points; });
  const rashedScoreRows = match.mode === "rashed" ? await db.select({ points: competitionRashedTurns.awardedPoints }).from(competitionRashedTurns).where(eq(competitionRashedTurns.matchId, matchId)) : [];
  const rashedScore = rashedScoreRows.reduce((total, row) => total + row.points, 0);
  const result = match.status === "finished" ? (await db.select().from(competitionMatchResults).where(eq(competitionMatchResults.matchId, matchId)).limit(1))[0] ?? null : null;

  return {
    match: { ...match, questionTotal: matchQuestions.length },
    players: players.map(player => ({ memberSlot: player.memberSlot, state: player.state, joinedAt: player.joinedAt, readyAt: player.readyAt, lastSeenAt: player.lastSeenAt })),
    question: question && current && ["question_active", "evaluating", "showing_result"].includes(match.status) ? { id: current.id, order: current.questionOrder, questionType: question.questionType, prompt: question.prompt, options: JSON.parse(question.optionsJson) as string[], difficulty: question.difficulty, imageUrl: question.sourceType === "image" ? question.sourceUrl : null, deadlineAt: current.deadlineAt, status: current.status } : null,
    answerStates: [...players.map(player => ({ memberSlot: player.memberSlot, submitted: answers.some(answer => answer.memberSlot === player.memberSlot) })), ...(match.mode === "rashed" ? [{ memberSlot: "rashed" as const, submitted: Boolean(rashedTurn) }] : [])],
    evaluations,
    scores,
    rashed: match.mode === "rashed" ? { name: "راشد", submitted: Boolean(rashedTurn), answerText: ["showing_result", "finished"].includes(match.status) ? rashedTurn?.answerText ?? null : null, rationale: ["showing_result", "finished"].includes(match.status) ? rashedTurn?.rationale ?? null : null, behavior: ["showing_result", "finished"].includes(match.status) ? rashedTurn?.behavior ?? null : null, outcome: ["showing_result", "finished"].includes(match.status) ? rashedTurn?.outcome ?? null : null, confidence: ["showing_result", "finished"].includes(match.status) ? rashedTurn?.confidence ?? null : null, awardedPoints: ["showing_result", "finished"].includes(match.status) ? rashedTurn?.awardedPoints ?? 0 : null, judgeReason: ["showing_result", "finished"].includes(match.status) ? rashedTurn?.judgeReason ?? null : null, score: rashedScore } : null,
    rationales,
    loayReview,
    result,
  };
}

export async function getRashedCoachContext(input: { matchId: number; matchQuestionId: number; member: MemberSlot }) {
  const db = await database();
  const match = await getMatchRecord(input.matchId);
  if (match.mode !== "rashed" || match.status !== "question_active") throw new Error("محادثة راشد متاحة أثناء سؤال نشط ضد راشد فقط.");
  await requirePlayer(input.matchId, input.member);
  const current = (await db.select().from(competitionMatchQuestions).where(and(eq(competitionMatchQuestions.id, input.matchQuestionId), eq(competitionMatchQuestions.matchId, input.matchId), eq(competitionMatchQuestions.questionOrder, match.currentQuestionOrder), eq(competitionMatchQuestions.status, "active"))).limit(1))[0];
  if (!current) throw new Error("السؤال ده مش هو السؤال النشط في المباراة.");
  const question = (await db.select({ prompt: competitionQuestions.prompt, questionType: competitionQuestions.questionType }).from(competitionQuestions).where(eq(competitionQuestions.id, current.questionId)).limit(1))[0];
  if (!question) throw new Error("السؤال لم يعد متاحاً للمناقشة.");
  return question;
}

export async function getCurrentCompetitionMatch(member: MemberSlot) {
  const db = await database();
  const membership = await db.select({ matchId: competitionMatchPlayers.matchId, state: competitionMatchPlayers.state }).from(competitionMatchPlayers).where(eq(competitionMatchPlayers.memberSlot, member)).orderBy(desc(competitionMatchPlayers.id));
  for (const item of membership) {
    if (item.state === "invited") continue;
    const match = (await db.select().from(competitionMatches).where(and(eq(competitionMatches.id, item.matchId), inArray(competitionMatches.status, activeMatchStatuses))).limit(1))[0];
    if (match) {
      await touchCompetitionPresence(match.id, member);
      return getCompetitionMatch(match.id, member);
    }
  }
  return null;
}

export async function listPendingCompetitionInvitations(member: MemberSlot) {
  const db = await database();
  const rows = await db.select({ matchId: competitionMatches.id, engineTitle: competitionEngines.title, createdBy: competitionMatches.createdBy, createdAt: competitionMatches.createdAt }).from(competitionMatchPlayers).innerJoin(competitionMatches, eq(competitionMatchPlayers.matchId, competitionMatches.id)).innerJoin(competitionEngines, eq(competitionMatches.engineId, competitionEngines.id)).where(and(eq(competitionMatchPlayers.memberSlot, member), eq(competitionMatchPlayers.state, "invited"), inArray(competitionMatches.status, ["waiting", "ready"]))).orderBy(desc(competitionMatches.createdAt));
  return rows;
}

export async function getLatestCompetitionMatch(member: MemberSlot) {
  const db = await database();
  const membership = await db.select({ matchId: competitionMatchPlayers.matchId }).from(competitionMatchPlayers).where(eq(competitionMatchPlayers.memberSlot, member)).orderBy(desc(competitionMatchPlayers.id));
  for (const item of membership) {
    const match = (await db.select().from(competitionMatches).where(eq(competitionMatches.id, item.matchId)).limit(1))[0];
    if (match) return getCompetitionMatch(match.id, member);
  }
  return null;
}

export async function saveCompetitionMatchRationale(input: { matchId: number; matchQuestionId: number; member: MemberSlot; content: string }) {
  const db = await database();
  const match = await getMatchRecord(input.matchId);
  if (match.status !== "question_active") throw new Error("صندوق التعليلات متاح أثناء السؤال النشط فقط.");
  await requirePlayer(input.matchId, input.member);
  const current = (await db.select({ id: competitionMatchQuestions.id }).from(competitionMatchQuestions).where(and(eq(competitionMatchQuestions.id, input.matchQuestionId), eq(competitionMatchQuestions.matchId, input.matchId), eq(competitionMatchQuestions.questionOrder, match.currentQuestionOrder), eq(competitionMatchQuestions.status, "active"))).limit(1))[0];
  if (!current) throw new Error("ده مش صندوق تعليلات السؤال النشط.");
  const content = input.content.trim().slice(0, 2200);
  if (content.length < 2) throw new Error("اكتبوا تعليلاً أو سبب اختيار واضحاً.");
  await db.insert(competitionMatchRationales).values({ matchId: input.matchId, matchQuestionId: input.matchQuestionId, authorKey: input.member, content }).onDuplicateKeyUpdate({ set: { content, updatedAt: new Date() } });
  return { saved: true as const };
}

export async function listCompetitionRationaleArchive(input: { matchId: number; member: MemberSlot; beforeRound?: number; limit?: number }) {
  const db = await database();
  const match = await getMatchRecord(input.matchId);
  await requirePlayer(input.matchId, input.member);
  const limit = Math.max(1, Math.min(30, input.limit ?? 12));
  const conditions = [eq(competitionMatchQuestions.matchId, input.matchId), eq(competitionMatchQuestions.status, "evaluated")];
  if (input.beforeRound !== undefined) conditions.push(lt(competitionMatchQuestions.questionOrder, input.beforeRound));
  const rounds = await db.select().from(competitionMatchQuestions).where(and(...conditions)).orderBy(desc(competitionMatchQuestions.questionOrder)).limit(limit + 1);
  const visible = rounds.slice(0, limit);
  const items = await Promise.all(visible.map(async round => {
    const question = (await db.select({ prompt: competitionQuestions.prompt }).from(competitionQuestions).where(eq(competitionQuestions.id, round.questionId)).limit(1))[0];
    const evaluations = await db.select({ memberSlot: competitionMatchEvaluations.memberSlot, outcome: competitionMatchEvaluations.outcome, awardedPoints: competitionMatchEvaluations.awardedPoints, reason: competitionMatchEvaluations.reason }).from(competitionMatchEvaluations).where(eq(competitionMatchEvaluations.matchQuestionId, round.id));
    const rashed = match.mode === "rashed" ? (await db.select({ outcome: competitionRashedTurns.outcome, awardedPoints: competitionRashedTurns.awardedPoints, answerText: competitionRashedTurns.answerText, rationale: competitionRashedTurns.rationale, judgeReason: competitionRashedTurns.judgeReason }).from(competitionRashedTurns).where(eq(competitionRashedTurns.matchQuestionId, round.id)).limit(1))[0] ?? null : null;
    const rationales = await db.select({ authorKey: competitionMatchRationales.authorKey, content: competitionMatchRationales.content }).from(competitionMatchRationales).where(eq(competitionMatchRationales.matchQuestionId, round.id)).orderBy(asc(competitionMatchRationales.id));
    const loayReview = (await db.select({ reviewText: competitionLoayRoundReviews.reviewText }).from(competitionLoayRoundReviews).where(eq(competitionLoayRoundReviews.matchQuestionId, round.id)).limit(1))[0] ?? null;
    const humanPoints = evaluations.find(item => item.memberSlot === input.member)?.awardedPoints ?? 0;
    const opponentMember = input.member === "saif" ? "haneen" : "saif";
    const opponentPoints = match.mode === "rashed" ? rashed?.awardedPoints ?? 0 : evaluations.find(item => item.memberSlot === opponentMember)?.awardedPoints ?? 0;
    const winnerKey = humanPoints === opponentPoints ? null : humanPoints > opponentPoints ? input.member : match.mode === "rashed" ? "rashed" : opponentMember;
    return { round: round.questionOrder + 1, questionPrompt: question?.prompt ?? "سؤال محفوظ", opponentKey: match.mode === "rashed" ? "rashed" as const : opponentMember, winnerKey, rationales, evaluations, rashed, loayReview: loayReview?.reviewText ?? null };
  }));
  return { items, nextBeforeRound: rounds.length > limit ? visible.at(-1)?.questionOrder : null };
}

export async function createCompetitionMatch(input: { engineId: number; member: MemberSlot }) {
  const db = await database();
  const { engine } = await getCompetitionEngineForQuestions(input.engineId);
  if (engine.status !== "ready") throw new Error("جهّزوا بنك أسئلة موثّق للمحرك الأول قبل فتح غرفة المنافسة.");
  const questions = await db.select({ id: competitionQuestions.id }).from(competitionQuestions).where(and(eq(competitionQuestions.engineId, input.engineId), eq(competitionQuestions.status, "validated"))).orderBy(asc(competitionQuestions.createdAt), asc(competitionQuestions.id));
  if (questions.length !== engine.questionCount) throw new Error("بنك أسئلة المحرك ناقص أو غير متوافق. جهّزوه من المصادر تاني.");
  const matchId = await db.transaction(async tx => {
    const activeForMember = await tx.select({ id: competitionMatches.id }).from(competitionMatches).innerJoin(competitionMatchPlayers, eq(competitionMatchPlayers.matchId, competitionMatches.id)).where(and(eq(competitionMatchPlayers.memberSlot, input.member), inArray(competitionMatchPlayers.state, engagedPlayerStates), inArray(competitionMatches.status, activeMatchStatuses))).limit(1);
    if (activeForMember[0]) throw new Error("عندك مباراة قائمة بالفعل. افتحها من صفحة «تنافس» لاستكمالها؛ لا تحتاج لحذفها أو إنهائها لفتح الشاشة.");
    const result = await tx.insert(competitionMatches).values({ engineId: input.engineId, engineTitleSnapshot: engine.title, engineSubjectNameSnapshot: engine.subjectName, status: "waiting", createdBy: input.member });
    const id = Number(result[0].insertId);
    const other = input.member === "saif" ? "haneen" : "saif";
    const now = new Date();
    await tx.insert(competitionMatchPlayers).values([{ matchId: id, memberSlot: input.member, state: "joined", joinedAt: now, lastSeenAt: now }, { matchId: id, memberSlot: other, state: "invited" }]);
    await tx.insert(competitionMatchQuestions).values(questions.map((question, questionOrder) => ({ matchId: id, questionId: question.id, questionOrder, status: "pending" as const })));
    return id;
  });
  return getCompetitionMatch(matchId, input.member);
}

export async function createRashedCompetitionMatch(input: { engineId: number; member: MemberSlot }) {
  const db = await database();
  const { engine } = await getCompetitionEngineForQuestions(input.engineId);
  if (engine.status !== "ready") throw new Error("جهّزوا بنك أسئلة موثّق للمحرك الأول قبل فتح مواجهة راشد.");
  const questions = await db.select({ id: competitionQuestions.id, questionType: competitionQuestions.questionType, prompt: competitionQuestions.prompt, optionsJson: competitionQuestions.optionsJson, evidenceQuote: competitionQuestions.evidenceQuote }).from(competitionQuestions).where(and(eq(competitionQuestions.engineId, input.engineId), eq(competitionQuestions.status, "validated"))).orderBy(asc(competitionQuestions.createdAt), asc(competitionQuestions.id));
  if (questions.length !== engine.questionCount) throw new Error("بنك أسئلة المحرك ناقص أو غير متوافق. جهّزوه من المصادر تاني.");
  const matchId = await db.transaction(async tx => {
    const activeForMember = await tx.select({ id: competitionMatches.id }).from(competitionMatches).innerJoin(competitionMatchPlayers, eq(competitionMatchPlayers.matchId, competitionMatches.id)).where(and(eq(competitionMatchPlayers.memberSlot, input.member), inArray(competitionMatchPlayers.state, engagedPlayerStates), inArray(competitionMatches.status, activeMatchStatuses))).limit(1);
    if (activeForMember[0]) throw new Error("عندك مباراة قائمة بالفعل. افتحها من صفحة «تنافس» لاستكمالها؛ لا تحتاج لحذفها أو إنهائها لفتح الشاشة.");
    const now = new Date();
    const result = await tx.insert(competitionMatches).values({ engineId: input.engineId, engineTitleSnapshot: engine.title, engineSubjectNameSnapshot: engine.subjectName, mode: "rashed", status: "waiting", createdBy: input.member });
    const id = Number(result[0].insertId);
    await tx.insert(competitionMatchPlayers).values({ matchId: id, memberSlot: input.member, state: "ready", joinedAt: now, readyAt: now, lastSeenAt: now });
    await tx.insert(competitionMatchQuestions).values(questions.map((question, questionOrder) => ({ matchId: id, questionId: question.id, questionOrder, status: "pending" as const })));
    return id;
  });
  const firstQuestion = questions[0];
  const activeQuestion = (await db.select().from(competitionMatchQuestions).where(and(eq(competitionMatchQuestions.matchId, matchId), eq(competitionMatchQuestions.questionOrder, 0))).limit(1))[0];
  if (!firstQuestion || !activeQuestion) throw new Error("تعذر تجهيز أول سؤال لمواجهة راشد.");
  const rashedReply = await generateRashedReply({ matchId, question: { id: firstQuestion.id, questionType: firstQuestion.questionType, prompt: firstQuestion.prompt, options: JSON.parse(firstQuestion.optionsJson) as string[], evidenceQuote: firstQuestion.evidenceQuote } });
  const now = new Date();
  const deadlineAt = deadlineFor(now, engine.questionTimeLimitSeconds);
  await db.transaction(async tx => {
    await tx.insert(competitionRashedTurns).values({ matchId, matchQuestionId: activeQuestion.id, answerText: rashedReply.answerText, rationale: rashedReply.rationale, behavior: rashedReply.behavior });
    if (rashedReply.rationale) await tx.insert(competitionMatchRationales).values({ matchId, matchQuestionId: activeQuestion.id, authorKey: "rashed", content: rashedReply.rationale });
    await tx.update(competitionMatches).set({ status: "question_active", currentQuestionOrder: 0, stateVersion: 2 }).where(and(eq(competitionMatches.id, matchId), eq(competitionMatches.status, "waiting")));
    await tx.update(competitionMatchQuestions).set({ status: "active", activatedAt: now, deadlineAt }).where(and(eq(competitionMatchQuestions.id, activeQuestion.id), eq(competitionMatchQuestions.status, "pending")));
  });
  return getCompetitionMatch(matchId, input.member);
}

export async function joinCompetitionMatch(matchId: number, member: MemberSlot) {
  const db = await database();
  const match = await getMatchRecord(matchId);
  if (!(["waiting", "ready"] as string[]).includes(match.status)) throw new Error("المباراة بدأت بالفعل ومش متاحة للانضمام الآن.");
  const player = await requirePlayer(matchId, member);
  const now = new Date();
  await db.update(competitionMatchPlayers).set({ state: player.state === "ready" ? "ready" : "joined", joinedAt: player.joinedAt ?? now, lastSeenAt: now }).where(eq(competitionMatchPlayers.id, player.id));
  const players = await db.select().from(competitionMatchPlayers).where(eq(competitionMatchPlayers.matchId, matchId));
  if (players.every(item => ["joined", "ready"].includes(item.state))) await db.update(competitionMatches).set({ status: "ready", stateVersion: match.stateVersion + 1 }).where(eq(competitionMatches.id, matchId));
  return getCompetitionMatch(matchId, member);
}

export async function setCompetitionMatchReady(matchId: number, member: MemberSlot) {
  const db = await database();
  const match = await getMatchRecord(matchId);
  if (!(["waiting", "ready"] as string[]).includes(match.status)) throw new Error("المباراة مش في مرحلة الاستعداد دلوقتي.");
  const player = await requirePlayer(matchId, member);
  if (player.state === "invited") throw new Error("ادخلوا الغرفة الأول قبل ما تعلنوا الجاهزية.");
  const now = new Date();
  await db.update(competitionMatchPlayers).set({ state: "ready", readyAt: now, lastSeenAt: now }).where(eq(competitionMatchPlayers.id, player.id));
  const players = await db.select().from(competitionMatchPlayers).where(eq(competitionMatchPlayers.matchId, matchId));
  if (players.every(item => item.state === "ready")) {
    const engine = (await db.select({ questionTimeLimitSeconds: competitionEngines.questionTimeLimitSeconds }).from(competitionEngines).where(eq(competitionEngines.id, match.engineId)).limit(1))[0];
    const deadlineAt = deadlineFor(now, engine?.questionTimeLimitSeconds ?? 0);
    await db.transaction(async tx => {
      await tx.update(competitionMatches).set({ status: "question_active", currentQuestionOrder: 0, stateVersion: match.stateVersion + 1 }).where(and(eq(competitionMatches.id, matchId), inArray(competitionMatches.status, ["waiting", "ready"])));
      await tx.update(competitionMatchQuestions).set({ status: "active", activatedAt: now, deadlineAt }).where(and(eq(competitionMatchQuestions.matchId, matchId), eq(competitionMatchQuestions.questionOrder, 0), eq(competitionMatchQuestions.status, "pending")));
    });
  } else {
    await db.update(competitionMatches).set({ status: "ready", stateVersion: match.stateVersion + 1 }).where(eq(competitionMatches.id, matchId));
  }
  return getCompetitionMatch(matchId, member);
}

export async function submitCompetitionMatchAnswer(input: { matchId: number; matchQuestionId: number; answerText: string; idempotencyKey: string; member: MemberSlot }) {
  const db = await database();
  const match = await getMatchRecord(input.matchId);
  if (match.status !== "question_active") throw new Error("إرسال الإجابة مش متاح في المرحلة دي.");
  const player = await requirePlayer(input.matchId, input.member);
  if (player.state !== "ready") throw new Error("لازم تكونوا جاهزين في الغرفة قبل إرسال الإجابة.");
  if (await settleCompetitionQuestionDeadline(input.matchId)) throw new Error("انتهى وقت السؤال واتسجلت حالة الغياب تلقائياً.");
  const question = (await db.select().from(competitionMatchQuestions).where(and(eq(competitionMatchQuestions.id, input.matchQuestionId), eq(competitionMatchQuestions.matchId, input.matchId), eq(competitionMatchQuestions.questionOrder, match.currentQuestionOrder), eq(competitionMatchQuestions.status, "active"))).limit(1))[0];
  if (!question) throw new Error("السؤال ده مش هو السؤال النشط حالياً.");
  if (question.deadlineAt && question.deadlineAt.getTime() <= Date.now()) {
    await settleCompetitionQuestionDeadline(input.matchId);
    throw new Error("انتهى وقت السؤال واتسجلت حالة الغياب تلقائياً.");
  }
  const previous = (await db.select().from(competitionMatchAnswers).where(and(eq(competitionMatchAnswers.matchId, input.matchId), eq(competitionMatchAnswers.idempotencyKey, input.idempotencyKey))).limit(1))[0];
  if (previous) return { alreadySubmitted: true, needsEvaluation: false };
  const memberAnswer = (await db.select().from(competitionMatchAnswers).where(and(eq(competitionMatchAnswers.matchQuestionId, question.id), eq(competitionMatchAnswers.memberSlot, input.member))).limit(1))[0];
  if (memberAnswer) throw new Error("إجابتك اتسجلت بالفعل، ومستنيين الطرف التاني.");

  const now = new Date();
  let needsEvaluation = false;
  await db.transaction(async tx => {
    await tx.insert(competitionMatchAnswers).values({ matchId: input.matchId, matchQuestionId: question.id, memberSlot: input.member, answerText: input.answerText.trim(), idempotencyKey: input.idempotencyKey });
    await tx.update(competitionMatchPlayers).set({ lastSeenAt: now }).where(eq(competitionMatchPlayers.id, player.id));
    const count = await tx.select({ id: competitionMatchAnswers.id }).from(competitionMatchAnswers).where(eq(competitionMatchAnswers.matchQuestionId, question.id));
    const rashedTurn = match.mode === "rashed" ? (await tx.select({ id: competitionRashedTurns.id }).from(competitionRashedTurns).where(eq(competitionRashedTurns.matchQuestionId, question.id)).limit(1))[0] : null;
    if (count.length === (match.mode === "rashed" ? 1 : 2) && (match.mode !== "rashed" || rashedTurn)) {
      await tx.update(competitionMatchQuestions).set({ status: "answered", answeredAt: now }).where(and(eq(competitionMatchQuestions.id, question.id), eq(competitionMatchQuestions.status, "active")));
      await tx.update(competitionMatches).set({ status: "evaluating", stateVersion: match.stateVersion + 1 }).where(and(eq(competitionMatches.id, input.matchId), eq(competitionMatches.status, "question_active")));
      needsEvaluation = true;
    }
  });
  return { alreadySubmitted: false, needsEvaluation };
}

export async function leaveCompetitionMatch(input: { matchId: number; member: MemberSlot }) {
  const db = await database();
  const match = await getMatchRecord(input.matchId);
  const player = await requirePlayer(input.matchId, input.member);
  if (player.state === "invited") throw new Error("الدعوة غير المقبولة لا تحتاج خروجاً ولا تُحسب منافسة.");
  if (match.status === "finished" || match.status === "cancelled") throw new Error("المنافسة دي انتهت بالفعل.");
  const now = new Date();

  if (["waiting", "ready"].includes(match.status)) {
    await db.transaction(async tx => {
      await tx.update(competitionMatches).set({ status: "cancelled", finishedAt: now, stateVersion: match.stateVersion + 1 }).where(and(eq(competitionMatches.id, input.matchId), inArray(competitionMatches.status, ["waiting", "ready"])));
      await tx.update(competitionMatchPlayers).set({ state: "finished" }).where(eq(competitionMatchPlayers.matchId, input.matchId));
    });
    return { kind: "cancelled_before_start" as const, winnerKey: null, forfeitedBy: input.member };
  }

  if (!(["question_active", "evaluating", "showing_result"] as string[]).includes(match.status)) throw new Error("الخروج غير متاح في حالة المنافسة الحالية.");
  const scoreRows = await db.select({ memberSlot: competitionScoreLedger.memberSlot, points: competitionScoreLedger.points }).from(competitionScoreLedger).where(eq(competitionScoreLedger.matchId, input.matchId));
  const scores: Record<MemberSlot, number> = { saif: 0, haneen: 0 };
  scoreRows.forEach(row => { scores[row.memberSlot as MemberSlot] += row.points; });
  const rashedRows = match.mode === "rashed" ? await db.select({ points: competitionRashedTurns.awardedPoints }).from(competitionRashedTurns).where(eq(competitionRashedTurns.matchId, input.matchId)) : [];
  const rashedPoints = rashedRows.reduce((total, row) => total + row.points, 0);
  const winnerKey = match.mode === "rashed" ? "rashed" as const : (input.member === "saif" ? "haneen" : "saif") as MemberSlot;
  const winnerSlot = winnerKey === "rashed" ? null : winnerKey;
  await db.transaction(async tx => {
    const fresh = (await tx.select().from(competitionMatches).where(and(eq(competitionMatches.id, input.matchId), inArray(competitionMatches.status, ["question_active", "evaluating", "showing_result"]))).limit(1))[0];
    if (!fresh) throw new Error("تغيّرت حالة المنافسة؛ افتح الصفحة مرة أخرى قبل الخروج.");
    const prior = (await tx.select({ id: competitionMatchResults.id }).from(competitionMatchResults).where(eq(competitionMatchResults.matchId, input.matchId)).limit(1))[0];
    if (!prior) await tx.insert(competitionMatchResults).values({ matchId: input.matchId, winnerSlot, winnerKey, completionReason: "forfeit", forfeitedBy: input.member, saifPoints: scores.saif, haneenPoints: scores.haneen, rashedPoints, finishedAt: now });
    await tx.update(competitionMatches).set({ status: "finished", finishedAt: now, stateVersion: fresh.stateVersion + 1 }).where(and(eq(competitionMatches.id, input.matchId), inArray(competitionMatches.status, ["question_active", "evaluating", "showing_result"])));
    await tx.update(competitionMatchPlayers).set({ state: "finished" }).where(eq(competitionMatchPlayers.matchId, input.matchId));
  });
  return { kind: "forfeit" as const, winnerKey, forfeitedBy: input.member, scores, rashedPoints };
}

import { and, asc, eq, isNull } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { competitionEngines, competitionLoayRoundReviews, competitionMatchAnswers, competitionMatchEvaluations, competitionMatchPlayers, competitionMatchQuestions, competitionMatchRationales, competitionMatchResults, competitionMatches, competitionQuestions, competitionRashedTurns, competitionScoreLedger, studyErrorEntries } from "../drizzle/schema";
import { getDb } from "./db";
import type { MemberSlot } from "./workspaceAccess";
import { parseMatchingPairs } from "./competitionQuestionTypes";
import { generateRashedReply } from "./competitionRashed";
import { generateLoayRoundReview } from "./competitionLoayReview";

type Outcome = "correct" | "partial" | "incorrect" | "manual_review";
type Verdict = { outcome: Outcome; confidence: number; reason: string; method: "exact" | "semantic" };
type ReviewOutcome = Exclude<Outcome, "manual_review">;
const SEMANTIC_PARTIAL_MIN = 55;
const SEMANTIC_CORRECT_MIN = 80;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حالياً.");
  return db;
}

const normalizeAnswer = (value: string) => value.trim().toLocaleLowerCase("ar").replace(/[\u064B-\u065F\u0670]/g, "").replace(/[^ء-ي0-9a-z]+/gi, " ").trim();
const pointsForOutcome = (outcome: Outcome) => outcome === "correct" ? 2 : outcome === "partial" ? 1 : 0;
const isReviewOutcome = (outcome: string): outcome is ReviewOutcome => ["correct", "partial", "incorrect"].includes(outcome);

export function evaluateMatchingAnswer(canonicalAnswer: string, answer: string): Verdict {
  const canonical = parseMatchingPairs(canonicalAnswer);
  const received = parseMatchingPairs(answer);
  if (canonical.length < 3 || received.length !== canonical.length) return { outcome: "incorrect", confidence: 100, reason: "أزواج التوصيل المُرسلة غير مكتملة أو غير صالحة.", method: "exact" };
  const expected = new Map(canonical.map(([left, right]) => [normalizeAnswer(left), normalizeAnswer(right)]));
  const correct = received.filter(([left, right]) => expected.get(normalizeAnswer(left)) === normalizeAnswer(right)).length;
  if (correct === expected.size) return { outcome: "correct", confidence: 100, reason: "كل أزواج التوصيل مطابقة للمفتاح المعتمد.", method: "exact" };
  if (correct > 0) return { outcome: "partial", confidence: 100, reason: `تم توصيل ${correct} من ${expected.size} أزواج بشكل صحيح.`, method: "exact" };
  return { outcome: "incorrect", confidence: 100, reason: "ولا زوج من أزواج التوصيل يطابق المفتاح المعتمد.", method: "exact" };
}

const verdictSchema = {
  type: "object",
  properties: {
    outcome: { type: "string", enum: ["correct", "partial", "incorrect", "manual_review"] },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    semanticMatch: { type: "integer", minimum: 0, maximum: 100 },
    reason: { type: "string", minLength: 4, maxLength: 1000 },
  },
  required: ["outcome", "confidence", "semanticMatch", "reason"],
  additionalProperties: false,
};

export async function evaluateCompetitionAnswer(input: { questionType: string; prompt: string; canonicalAnswer: string; evidenceQuote: string; explanation: string; answer: string }): Promise<Verdict> {
  if (input.questionType === "matching") return evaluateMatchingAnswer(input.canonicalAnswer, input.answer);
  if (input.answer === "__competition_timeout__") return { outcome: "incorrect", confidence: 100, reason: "انتهى وقت السؤال من غير إجابة مُرسلة.", method: "exact" };
  const canonical = normalizeAnswer(input.canonicalAnswer);
  const received = normalizeAnswer(input.answer);
  if (canonical && received === canonical) return { outcome: "correct", confidence: 100, reason: "الإجابة تطابق الإجابة المعتمدة في المصدر.", method: "exact" };

  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 1000,
      responseFormat: { type: "json_schema", json_schema: { name: "competition_answer_verdict", strict: true, schema: verdictSchema } },
      messages: [
        { role: "system", content: `أنت لؤي، مقيّم تربوي عادل وإنساني. احكم فقط من مفتاح الإجابة والدليل والتفسير المعطاة، ولا تخترع معلومة. قيّم المعنى والفكرة الأساسية لا التطابق الحرفي: اقبل الصياغة الطبيعية والعامية المصرية والأخطاء الإملائية البسيطة وترتيب الكلمات المختلف ما دامت لا تغيّر المعنى العلمي. semanticMatch هو نسبة تقارب المعنى والفكرة مع الإجابة المعتمدة من 0 إلى 100. correct عند ${SEMANTIC_CORRECT_MIN}% أو أكثر بلا تناقض جوهري؛ partial عند ${SEMANTIC_PARTIAL_MIN}–${SEMANTIC_CORRECT_MIN - 1}% إذا كانت الفكرة الأساسية صحيحة لكنها ناقصة أو أقل دقة؛ incorrect تحت ${SEMANTIC_PARTIAL_MIN}% أو عند وجود تناقض جوهري؛ manual_review فقط عندما يكون المعنى ملتبساً بصدق ولا يمكن الحسم من المصدر. لا تعاقب على الأسلوب أو اللهجة، ولا تذكر درجات أو نقاط؛ الخادم يحسبها.` },
        { role: "user", content: `نوع السؤال: ${input.questionType}\nالسؤال: ${input.prompt}\nالإجابة المعتمدة: ${input.canonicalAnswer}\nدليل المصدر: ${input.evidenceQuote}\nالتفسير: ${input.explanation}\nإجابة الطالب: ${input.answer}` },
      ],
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") throw new Error("missing verdict");
    const verdict = JSON.parse(content) as { outcome: Outcome; confidence: number; semanticMatch: number; reason: string };
    if (!["correct", "partial", "incorrect", "manual_review"].includes(verdict.outcome) || !Number.isFinite(verdict.confidence) || !Number.isFinite(verdict.semanticMatch) || !verdict.reason?.trim()) throw new Error("invalid verdict");
    const confidence = Math.max(0, Math.min(100, Math.round(verdict.confidence)));
    const semanticMatch = Math.max(0, Math.min(100, Math.round(verdict.semanticMatch)));
    const outcome: Outcome = semanticMatch >= SEMANTIC_CORRECT_MIN ? "correct" : semanticMatch >= SEMANTIC_PARTIAL_MIN ? "partial" : verdict.outcome === "manual_review" ? "manual_review" : "incorrect";
    if (confidence < SEMANTIC_PARTIAL_MIN && semanticMatch < SEMANTIC_PARTIAL_MIN) return { outcome: "manual_review", confidence, reason: verdict.reason.trim().slice(0, 1200), method: "semantic" };
    return { outcome, confidence, reason: verdict.reason.trim().slice(0, 1200), method: "semantic" };
  } catch {
    return { outcome: "manual_review", confidence: 0, reason: "التقييم الآلي غير واثق من الإجابة؛ سجّلناها للمراجعة بدلاً من منح نقاط تلقائية.", method: "semantic" };
  }
}

export async function evaluateCompetitionQuestion(matchId: number) {
  const db = await database();
  const match = (await db.select().from(competitionMatches).where(eq(competitionMatches.id, matchId)).limit(1))[0];
  if (!match || match.status !== "evaluating") return null;
  const matchQuestion = (await db.select().from(competitionMatchQuestions).where(and(eq(competitionMatchQuestions.matchId, matchId), eq(competitionMatchQuestions.questionOrder, match.currentQuestionOrder), eq(competitionMatchQuestions.status, "answered"))).limit(1))[0];
  if (!matchQuestion) return null;
  const question = (await db.select().from(competitionQuestions).where(eq(competitionQuestions.id, matchQuestion.questionId)).limit(1))[0];
  const engine = (await db.select().from(competitionEngines).where(eq(competitionEngines.id, match.engineId)).limit(1))[0];
  const answers = await db.select().from(competitionMatchAnswers).where(eq(competitionMatchAnswers.matchQuestionId, matchQuestion.id)).orderBy(asc(competitionMatchAnswers.id));
  const rashedTurn = match.mode === "rashed" ? (await db.select().from(competitionRashedTurns).where(eq(competitionRashedTurns.matchQuestionId, matchQuestion.id)).limit(1))[0] : null;
  const existing = await db.select().from(competitionMatchEvaluations).where(eq(competitionMatchEvaluations.matchQuestionId, matchQuestion.id));
  if (match.mode === "duel" && existing.length === 2) return existing;
  if (match.mode === "rashed" && existing.length === 1 && rashedTurn?.outcome) return existing;
  if (!question || answers.length !== (match.mode === "rashed" ? 1 : 2) || (match.mode === "rashed" && !rashedTurn)) throw new Error("لا يمكن تقييم الجولة قبل وصول الإجابات اللازمة والسؤال المعتمد.");
  const canonicalAnswer = (JSON.parse(question.answerJson) as { canonicalAnswer?: string }).canonicalAnswer?.trim();
  if (!canonicalAnswer) throw new Error("السؤال لا يحتوي إجابة معتمدة قابلة للتقييم.");

  const verdicts = await Promise.all(answers.map(async answer => ({ answer, verdict: await evaluateCompetitionAnswer({ questionType: question.questionType, prompt: question.prompt, canonicalAnswer, evidenceQuote: question.evidenceQuote, explanation: question.explanation, answer: answer.answerText }) })));
  const rashedVerdict = rashedTurn ? await evaluateCompetitionAnswer({ questionType: question.questionType, prompt: question.prompt, canonicalAnswer, evidenceQuote: question.evidenceQuote, explanation: question.explanation, answer: rashedTurn.answerText }) : null;
  const rationales = await db.select({ authorKey: competitionMatchRationales.authorKey, content: competitionMatchRationales.content }).from(competitionMatchRationales).where(eq(competitionMatchRationales.matchQuestionId, matchQuestion.id));
  const loayReview = await generateLoayRoundReview({
    prompt: question.prompt,
    canonicalAnswer,
    evidenceQuote: question.evidenceQuote,
    explanation: question.explanation,
    answers: [
      ...verdicts.map(item => ({ author: item.answer.memberSlot === "saif" ? "سيف" : "حنين", answer: item.answer.answerText, outcome: item.verdict.outcome, reason: item.verdict.reason })),
      ...(rashedTurn && rashedVerdict ? [{ author: "راشد", answer: rashedTurn.answerText, outcome: rashedVerdict.outcome, reason: rashedVerdict.reason }] : []),
    ],
    rationales: rationales.map(item => ({ author: item.authorKey === "saif" ? "سيف" : item.authorKey === "haneen" ? "حنين" : "راشد", content: item.content })),
  });
  await db.transaction(async tx => {
    const now = new Date();
    for (const item of verdicts) {
      const prior = (await tx.select({ id: competitionMatchEvaluations.id }).from(competitionMatchEvaluations).where(eq(competitionMatchEvaluations.answerId, item.answer.id)).limit(1))[0];
      if (prior) continue;
      const awardedPoints = pointsForOutcome(item.verdict.outcome);
      await tx.insert(competitionMatchEvaluations).values({ matchId, matchQuestionId: matchQuestion.id, answerId: item.answer.id, memberSlot: item.answer.memberSlot, outcome: item.verdict.outcome, method: item.verdict.method, confidence: item.verdict.confidence, awardedPoints, reason: item.verdict.reason });
      if (awardedPoints > 0) await tx.insert(competitionScoreLedger).values({ matchId, matchQuestionId: matchQuestion.id, memberSlot: item.answer.memberSlot, points: awardedPoints, eventKey: `competition:${matchId}:question:${matchQuestion.id}:member:${item.answer.memberSlot}` });
      if (item.verdict.outcome !== "correct" && item.verdict.outcome !== "manual_review") await tx.insert(studyErrorEntries).values({ sourceType: "quiz", subjectKey: engine?.subjectKey ?? null, subjectName: engine?.subjectName ?? "منافسة لؤي", lessonTitle: engine?.lessonTitle ?? engine?.title ?? null, prompt: question.prompt, mistake: item.answer.answerText, correction: `${canonicalAnswer} — ${question.explanation}`.slice(0, 8000), reviewNote: item.verdict.reason.slice(0, 500), createdBy: item.answer.memberSlot });
    }
    if (rashedTurn && rashedVerdict) await tx.update(competitionRashedTurns).set({ outcome: rashedVerdict.outcome, confidence: rashedVerdict.confidence, awardedPoints: pointsForOutcome(rashedVerdict.outcome), judgeReason: rashedVerdict.reason, evaluatedAt: now }).where(eq(competitionRashedTurns.id, rashedTurn.id));
    const savedReview = (await tx.select({ id: competitionLoayRoundReviews.id }).from(competitionLoayRoundReviews).where(eq(competitionLoayRoundReviews.matchQuestionId, matchQuestion.id)).limit(1))[0];
    if (!savedReview) await tx.insert(competitionLoayRoundReviews).values({ matchId, matchQuestionId: matchQuestion.id, reviewText: loayReview });
    await tx.update(competitionMatchQuestions).set({ status: "evaluated", evaluatedAt: now }).where(and(eq(competitionMatchQuestions.id, matchQuestion.id), eq(competitionMatchQuestions.status, "answered")));
    await tx.update(competitionMatches).set({ status: "showing_result", stateVersion: match.stateVersion + 1 }).where(and(eq(competitionMatches.id, matchId), eq(competitionMatches.status, "evaluating")));
  });
  return db.select().from(competitionMatchEvaluations).where(eq(competitionMatchEvaluations.matchQuestionId, matchQuestion.id));
}

async function getCurrentManualReview(tx: any, input: { matchId: number; evaluationId: number }) {
  const match = (await tx.select().from(competitionMatches).where(eq(competitionMatches.id, input.matchId)).limit(1))[0];
  if (!match || match.status !== "showing_result") throw new Error("المراجعة اليدوية متاحة أثناء عرض نتيجة السؤال الحالي فقط.");
  const currentQuestion = (await tx.select({ id: competitionMatchQuestions.id }).from(competitionMatchQuestions).where(and(eq(competitionMatchQuestions.matchId, input.matchId), eq(competitionMatchQuestions.questionOrder, match.currentQuestionOrder))).limit(1))[0];
  if (!currentQuestion) throw new Error("سؤال المراجعة الحالي غير موجود.");
  const evaluation = (await tx.select().from(competitionMatchEvaluations).where(and(eq(competitionMatchEvaluations.id, input.evaluationId), eq(competitionMatchEvaluations.matchId, input.matchId), eq(competitionMatchEvaluations.matchQuestionId, currentQuestion.id))).limit(1))[0];
  if (!evaluation || evaluation.outcome !== "manual_review") throw new Error("الحكم ده مش محتاج مراجعة يدوية.");
  return evaluation;
}

export async function proposeCompetitionManualReview(input: { matchId: number; evaluationId: number; member: MemberSlot; outcome: ReviewOutcome; note?: string }) {
  if (!isReviewOutcome(input.outcome)) throw new Error("اختاروا حكماً صحيحاً أو جزئياً أو غير صحيح للمراجعة.");
  const db = await database();
  await db.transaction(async tx => {
    const player = (await tx.select({ id: competitionMatchPlayers.id }).from(competitionMatchPlayers).where(and(eq(competitionMatchPlayers.matchId, input.matchId), eq(competitionMatchPlayers.memberSlot, input.member))).limit(1))[0];
    if (!player) throw new Error("العضو ده مش مشارك في المباراة دي.");
    const evaluation = await getCurrentManualReview(tx, input);
    if (evaluation.memberSlot !== input.member) throw new Error("كل لاعب يقدر يقترح مراجعة الحكم المسجل لإجابته هو فقط.");
    if (evaluation.reviewProposedBy) throw new Error("اتسجل اقتراح للمراجعة بالفعل، ومستنيين تأكيد اللاعب التاني.");
    await tx.update(competitionMatchEvaluations).set({ reviewProposedOutcome: input.outcome, reviewProposedBy: input.member, reviewNote: input.note?.trim().slice(0, 1200) || null, reviewProposedAt: new Date() }).where(eq(competitionMatchEvaluations.id, evaluation.id));
  });
  return { proposed: true as const };
}

export async function confirmCompetitionManualReview(input: { matchId: number; evaluationId: number; member: MemberSlot }) {
  const db = await database();
  await db.transaction(async tx => {
    const player = (await tx.select({ id: competitionMatchPlayers.id }).from(competitionMatchPlayers).where(and(eq(competitionMatchPlayers.matchId, input.matchId), eq(competitionMatchPlayers.memberSlot, input.member))).limit(1))[0];
    if (!player) throw new Error("العضو ده مش مشارك في المباراة دي.");
    const evaluation = await getCurrentManualReview(tx, input);
    if (!evaluation.reviewProposedBy || !evaluation.reviewProposedOutcome || !isReviewOutcome(evaluation.reviewProposedOutcome)) throw new Error("مفيش اقتراح مراجعة صالح للتأكيد دلوقتي.");
    if (evaluation.reviewProposedBy === input.member || evaluation.memberSlot === input.member) throw new Error("تأكيد المراجعة لازم ييجي من اللاعب التاني.");
    if (evaluation.reviewConfirmedBy) throw new Error("المراجعة دي اتأكدت بالفعل.");
    const awardedPoints = pointsForOutcome(evaluation.reviewProposedOutcome);
    const resolvedReason = `مراجعة مشتركة مؤكدة: ${evaluation.reviewProposedOutcome === "correct" ? "إجابة صحيحة" : evaluation.reviewProposedOutcome === "partial" ? "إجابة جزئية" : "إجابة غير صحيحة"}${evaluation.reviewNote ? ` — ${evaluation.reviewNote}` : ""}`.slice(0, 1200);
    await tx.update(competitionMatchEvaluations).set({ outcome: evaluation.reviewProposedOutcome, awardedPoints, reason: resolvedReason, reviewConfirmedBy: input.member, reviewResolvedAt: new Date() }).where(and(eq(competitionMatchEvaluations.id, evaluation.id), isNull(competitionMatchEvaluations.reviewConfirmedBy)));
    if (awardedPoints > 0) await tx.insert(competitionScoreLedger).values({ matchId: input.matchId, matchQuestionId: evaluation.matchQuestionId, memberSlot: evaluation.memberSlot, points: awardedPoints, eventKey: `competition:${input.matchId}:question:${evaluation.matchQuestionId}:member:${evaluation.memberSlot}` });
    if (evaluation.reviewProposedOutcome !== "correct") {
      const answer = (await tx.select().from(competitionMatchAnswers).where(eq(competitionMatchAnswers.id, evaluation.answerId)).limit(1))[0];
      const question = (await tx.select().from(competitionQuestions).innerJoin(competitionMatchQuestions, eq(competitionQuestions.id, competitionMatchQuestions.questionId)).where(eq(competitionMatchQuestions.id, evaluation.matchQuestionId)).limit(1))[0];
      const engine = (await tx.select().from(competitionEngines).innerJoin(competitionMatches, eq(competitionEngines.id, competitionMatches.engineId)).where(eq(competitionMatches.id, input.matchId)).limit(1))[0];
      if (answer && question && engine) {
        const canonicalAnswer = (JSON.parse(question.competitionQuestions.answerJson) as { canonicalAnswer?: string }).canonicalAnswer?.trim() || "الإجابة المعتمدة";
        await tx.insert(studyErrorEntries).values({ sourceType: "quiz", subjectKey: engine.competitionEngines.subjectKey, subjectName: engine.competitionEngines.subjectName || "منافسة لؤي", lessonTitle: engine.competitionEngines.lessonTitle || engine.competitionEngines.title, prompt: question.competitionQuestions.prompt, mistake: answer.answerText, correction: `${canonicalAnswer} — ${question.competitionQuestions.explanation}`.slice(0, 8000), reviewNote: resolvedReason.slice(0, 500), createdBy: evaluation.memberSlot });
      }
    }
  });
  return { confirmed: true as const };
}

export async function advanceCompetitionMatch(input: { matchId: number; member: MemberSlot }) {
  const db = await database();
  const player = (await db.select({ id: competitionMatchPlayers.id }).from(competitionMatchPlayers).where(and(eq(competitionMatchPlayers.matchId, input.matchId), eq(competitionMatchPlayers.memberSlot, input.member))).limit(1))[0];
  if (!player) throw new Error("العضو ده مش مشارك في المباراة دي.");
  const match = (await db.select().from(competitionMatches).where(eq(competitionMatches.id, input.matchId)).limit(1))[0];
  if (!match || match.status !== "showing_result") throw new Error("لازم تظهر نتيجة السؤال الحالي الأول قبل الانتقال.");
  const currentQuestion = (await db.select({ id: competitionMatchQuestions.id }).from(competitionMatchQuestions).where(and(eq(competitionMatchQuestions.matchId, input.matchId), eq(competitionMatchQuestions.questionOrder, match.currentQuestionOrder))).limit(1))[0];
  const unresolvedManualReview = match.mode === "duel" && currentQuestion ? (await db.select({ id: competitionMatchEvaluations.id }).from(competitionMatchEvaluations).where(and(eq(competitionMatchEvaluations.matchQuestionId, currentQuestion.id), eq(competitionMatchEvaluations.outcome, "manual_review"))).limit(1))[0] : null;
  if (unresolvedManualReview) throw new Error("لازم يتحسم كل تقييم محتاج مراجعة مشتركة قبل الانتقال للسؤال التالي.");
  const nextQuestion = (await db.select().from(competitionMatchQuestions).where(and(eq(competitionMatchQuestions.matchId, input.matchId), eq(competitionMatchQuestions.questionOrder, match.currentQuestionOrder + 1), eq(competitionMatchQuestions.status, "pending"))).limit(1))[0];
  const now = new Date();
  if (nextQuestion) {
    const engine = (await db.select({ questionTimeLimitSeconds: competitionEngines.questionTimeLimitSeconds }).from(competitionEngines).where(eq(competitionEngines.id, match.engineId)).limit(1))[0];
    const deadlineAt = (engine?.questionTimeLimitSeconds ?? 0) > 0 ? new Date(now.getTime() + (engine?.questionTimeLimitSeconds ?? 0) * 1000) : null;
    const rashedQuestion = match.mode === "rashed" ? (await db.select({ id: competitionQuestions.id, questionType: competitionQuestions.questionType, prompt: competitionQuestions.prompt, optionsJson: competitionQuestions.optionsJson, evidenceQuote: competitionQuestions.evidenceQuote }).from(competitionQuestions).where(eq(competitionQuestions.id, nextQuestion.questionId)).limit(1))[0] : null;
    const rashedReply = rashedQuestion ? await generateRashedReply({ matchId: input.matchId, question: { id: rashedQuestion.id, questionType: rashedQuestion.questionType, prompt: rashedQuestion.prompt, options: JSON.parse(rashedQuestion.optionsJson) as string[], evidenceQuote: rashedQuestion.evidenceQuote } }) : null;
    await db.transaction(async tx => {
      if (rashedReply) {
        await tx.insert(competitionRashedTurns).values({ matchId: input.matchId, matchQuestionId: nextQuestion.id, answerText: rashedReply.answerText, rationale: rashedReply.rationale, behavior: rashedReply.behavior });
        if (rashedReply.rationale) await tx.insert(competitionMatchRationales).values({ matchId: input.matchId, matchQuestionId: nextQuestion.id, authorKey: "rashed", content: rashedReply.rationale });
      }
      await tx.update(competitionMatches).set({ status: "question_active", currentQuestionOrder: nextQuestion.questionOrder, stateVersion: match.stateVersion + 1 }).where(and(eq(competitionMatches.id, input.matchId), eq(competitionMatches.status, "showing_result")));
      await tx.update(competitionMatchQuestions).set({ status: "active", activatedAt: now, deadlineAt }).where(and(eq(competitionMatchQuestions.id, nextQuestion.id), eq(competitionMatchQuestions.status, "pending")));
    });
    return { finished: false as const };
  }
  const scores: Record<MemberSlot, number> = { saif: 0, haneen: 0 };
  const rows = await db.select({ memberSlot: competitionScoreLedger.memberSlot, points: competitionScoreLedger.points }).from(competitionScoreLedger).where(eq(competitionScoreLedger.matchId, input.matchId));
  rows.forEach(row => { scores[row.memberSlot as MemberSlot] += row.points; });
  const rashedRows = match.mode === "rashed" ? await db.select({ points: competitionRashedTurns.awardedPoints }).from(competitionRashedTurns).where(eq(competitionRashedTurns.matchId, input.matchId)) : [];
  const rashedPoints = rashedRows.reduce((total, row) => total + row.points, 0);
  const humanPoints = scores[input.member];
  const winnerKey = match.mode === "rashed" ? (humanPoints === rashedPoints ? null : humanPoints > rashedPoints ? input.member : "rashed") : (scores.saif === scores.haneen ? null : scores.saif > scores.haneen ? "saif" : "haneen");
  const winnerSlot = winnerKey === "saif" || winnerKey === "haneen" ? winnerKey : null;
  await db.transaction(async tx => {
    const alreadyFinished = (await tx.select({ id: competitionMatchResults.id }).from(competitionMatchResults).where(eq(competitionMatchResults.matchId, input.matchId)).limit(1))[0];
    if (!alreadyFinished) await tx.insert(competitionMatchResults).values({ matchId: input.matchId, winnerSlot, winnerKey, saifPoints: scores.saif, haneenPoints: scores.haneen, rashedPoints, finishedAt: now });
    await tx.update(competitionMatches).set({ status: "finished", finishedAt: now, stateVersion: match.stateVersion + 1 }).where(and(eq(competitionMatches.id, input.matchId), eq(competitionMatches.status, "showing_result")));
    await tx.update(competitionMatchPlayers).set({ state: "finished" }).where(eq(competitionMatchPlayers.matchId, input.matchId));
  });
  return { finished: true as const, winnerSlot, winnerKey, scores, rashedPoints };
}

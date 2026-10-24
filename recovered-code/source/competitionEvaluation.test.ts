import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateMatchingAnswer } from "./competitionEvaluation";

const source = readFileSync(new URL("./competitionEvaluation.ts", import.meta.url), "utf8");

describe("تقييم منافسة لؤي", () => {
  it("يحسب النقاط في الخادم من الحكم المعنوي ويقبل الإجابة القريبة من 55% مع مراجعة الغموض", () => {
    expect(source).toContain("const pointsForOutcome");
    expect(source).toContain("SEMANTIC_PARTIAL_MIN = 55");
    expect(source).toContain("SEMANTIC_CORRECT_MIN = 80");
    expect(source).toContain("semanticMatch");
    expect(source).toContain("العامية المصرية");
    expect(source).toContain('outcome: "manual_review"');
    expect(source).toContain("competitionScoreLedger");
    expect(source).toContain("studyErrorEntries");
  });

  it("ينهي السؤال في نتيجة ظاهرة ثم ينقل خادمياً للسؤال التالي أو النتيجة النهائية", () => {
    expect(source).toContain('status: "showing_result"');
    expect(source).toContain('status: "question_active"');
    expect(source).toContain('status: "finished"');
    expect(source).toContain("competitionMatchResults");
  });

  it("لا يحسم المراجعة اليدوية ولا يضيف نقاطاً إلا باقتراح صاحب الإجابة وتأكيد اللاعب الآخر", () => {
    expect(source).toContain("proposeCompetitionManualReview");
    expect(source).toContain("confirmCompetitionManualReview");
    expect(source).toContain("كل لاعب يقدر يقترح مراجعة الحكم المسجل لإجابته هو فقط");
    expect(source).toContain("تأكيد المراجعة لازم ييجي من اللاعب التاني");
    expect(source).toContain("reviewProposedOutcome");
    expect(source).toContain("reviewConfirmedBy");
    expect(source).toContain("if (awardedPoints > 0) await tx.insert(competitionScoreLedger)");
  });

  it("يحظر الانتقال أو إنهاء المباراة ما دامت مراجعة السؤال الحالي غير محسومة", () => {
    expect(source).toContain("unresolvedManualReview");
    expect(source).toContain("لازم يتحسم كل تقييم محتاج مراجعة مشتركة قبل الانتقال للسؤال التالي");
    expect(source).toContain('eq(competitionMatchEvaluations.outcome, "manual_review")');
  });

  it("يقيّم أزواج التوصيل كاملاً أو جزئياً أو خاطئاً من المفتاح الخادمي فقط", () => {
    const answer = "التسارع=>معدل التغير|الزمن=>الفترة|السرعة=>كمية متجهة";
    expect(evaluateMatchingAnswer(answer, answer)).toMatchObject({ outcome: "correct", method: "exact", confidence: 100 });
    expect(evaluateMatchingAnswer(answer, "التسارع=>معدل التغير|الزمن=>كمية متجهة|السرعة=>الفترة")).toMatchObject({ outcome: "partial", method: "exact", confidence: 100 });
    expect(evaluateMatchingAnswer(answer, "التسارع=>الفترة|الزمن=>كمية متجهة|السرعة=>معدل التغير")).toMatchObject({ outcome: "incorrect", method: "exact", confidence: 100 });
  });

  it("يعامل غياب الإجابة بعد انتهاء المؤقت كحكم حتمي بلا نقاط ولا تقييم دلالي", () => {
    expect(source).toContain('input.answer === "__competition_timeout__"');
    expect(source).toContain("انتهى وقت السؤال من غير إجابة مُرسلة");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeRashedReply, rashedBehaviorForRound } from "./competitionRashed";

const generator = readFileSync(new URL("./competitionRashed.ts", import.meta.url), "utf8");
const matchService = readFileSync(new URL("./competitionMatchDb.ts", import.meta.url), "utf8");
const evaluationService = readFileSync(new URL("./competitionEvaluation.ts", import.meta.url), "utf8");

const question = { id: 7, questionType: "multiple_choice", prompt: "سؤال تدريبي", options: ["أ", "ب", "ج"], evidenceQuote: "دليل" };

describe("راشد المنافس التعليمي", () => {
  it("يملك سلوكاً متوازناً ومتغيراً، ويعيد نتيجة حتمية للجولة نفسها", () => {
    expect(rashedBehaviorForRound(12, 7)).toBe(rashedBehaviorForRound(12, 7));
    const behaviors = new Set(Array.from({ length: 40 }, (_, index) => rashedBehaviorForRound(index + 1, index + 11)));
    expect(behaviors).toEqual(new Set(["analysis", "intentional_mistake"]));
  });

  it("يقبل اختياراً مشروعاً فقط ويستبدل ناتج النموذج غير الصالح ببديل آمن", () => {
    expect(normalizeRashedReply(question, { answerText: "ب", rationale: "تحليل قصير" }, "analysis")).toMatchObject({ answerText: "ب", rationale: "تحليل قصير" });
    const fallback = normalizeRashedReply(question, { answerText: "إجابة مخترعة" }, "intentional_mistake");
    expect(question.options).toContain(fallback.answerText);
  });

  it("لا يمرر مفتاح الإجابة لراشد ويحفظ رده خادمياً ثم يخفيه حتى الحسم", () => {
    expect(generator).not.toContain("canonicalAnswer");
    expect(generator).toContain("لا تملك مفتاح الإجابة");
    expect(matchService).toContain("createRashedCompetitionMatch");
    expect(matchService).toContain("competitionRashedTurns");
    expect(matchService).toContain('answerText: ["showing_result", "finished"].includes(match.status)');
  });

  it("يبقي المراجعة المشتركة محمية في الثنائية ولا يعلق مواجهة راشد الفردية", () => {
    expect(evaluationService).toContain('match.mode === "duel" && currentQuestion');
  });
});

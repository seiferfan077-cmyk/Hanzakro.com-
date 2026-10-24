import { describe, expect, it } from "vitest";
import { fallbackLoayRoundReview } from "./competitionLoayReview";

describe("مراجعة لؤي لصندوق التعليلات", () => {
  it("تحفظ تصحيحاً ودليلاً وخطوة إصلاح حتى عند تعذر استدعاء النموذج", () => {
    const review = fallbackLoayRoundReview({
      prompt: "ما الفكرة الأساسية؟",
      canonicalAnswer: "الإجابة المعتمدة",
      evidenceQuote: "دليل المصدر",
      explanation: "تفسير المصدر",
      answers: [{ author: "سيف", answer: "إجابة", outcome: "incorrect", reason: "لا تطابق الدليل" }],
      rationales: [{ author: "سيف", content: "اخترتها لأنها الأقرب في رأيي" }],
    });
    expect(review).toContain("الإجابة المعتمدة");
    expect(review).toContain("دليل المصدر");
    expect(review).toContain("خطوة الإصلاح");
    expect(review).toContain("اخترتها لأنها الأقرب");
  });
});

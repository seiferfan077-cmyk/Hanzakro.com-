import { describe, expect, it } from "vitest";
import { validateGeneratedQuestion } from "./competitionQuestionTypes";

const source = "ينص المصدر على أن التسارع هو معدل التغير في السرعة المتجهة بالنسبة للزمن.";

const valid = {
  questionType: "multiple_choice" as const,
  prompt: "ما التعريف الذي يقدمه المصدر للتسارع؟",
  options: ["معدل التغير في السرعة المتجهة بالنسبة للزمن", "المسافة المقطوعة", "الزمن اللازم", "القوة المؤثرة"],
  answer: "معدل التغير في السرعة المتجهة بالنسبة للزمن",
  explanation: "الإجابة مأخوذة مباشرة من نص المصدر.",
  evidenceQuote: "التسارع هو معدل التغير في السرعة المتجهة بالنسبة للزمن",
  difficulty: 2,
  quality: { questionClear: true, oneVerifiableAnswer: true, referenceIsSufficient: true },
};

describe("competition question validation", () => {
  it("يقبل سؤالاً موثقاً يمكن تقييمه من المصدر نفسه", () => {
    expect(validateGeneratedQuestion(valid, 12, source)).toMatchObject({ sourceId: 12, questionType: "multiple_choice", prompt: valid.prompt });
  });

  it("يرفض دليلاً غير موجود في لقطة المصدر", () => {
    expect(validateGeneratedQuestion({ ...valid, evidenceQuote: "هذه جملة غير موجودة في المصدر" }, 12, source)).toBeNull();
  });

  it("يقبل دليلاً يطابق المصدر بعد توحيد مسافات ومحارف PDF فقط", () => {
    const pdfLikeSource = "ينص المصدر على أن التسارع هو معدل\nالتغير في السرعة\u200b المتجهة بالنسبة للزمن.";
    expect(validateGeneratedQuestion(valid, 12, pdfLikeSource)).toMatchObject({ sourceId: 12, evidenceQuote: valid.evidenceQuote });
  });

  it("يرفض اختياراً من متعدد لا يحتوي الإجابة الصحيحة بين البدائل", () => {
    expect(validateGeneratedQuestion({ ...valid, options: valid.options.slice(1) }, 12, source)).toBeNull();
  });

  it("يقبل سؤال توصيل بأزواج كاملة من العمودين", () => {
    const matching = {
      ...valid,
      questionType: "matching" as const,
      prompt: "وصّل كل مصطلح في العمود الأول بوصفه الصحيح من المصدر.",
      options: ["L:التسارع", "L:السرعة المتجهة", "L:الزمن", "R:معدل التغير في السرعة المتجهة", "R:كمية لها مقدار واتجاه", "R:الفترة التي يحدث خلالها التغير"],
      answer: "التسارع=>معدل التغير في السرعة المتجهة|السرعة المتجهة=>كمية لها مقدار واتجاه|الزمن=>الفترة التي يحدث خلالها التغير",
    };
    expect(validateGeneratedQuestion(matching, 12, source)).toMatchObject({ sourceId: 12, questionType: "matching" });
  });

  it("يرفض سؤال توصيل لا يغطي كل عناصر العمودين", () => {
    const incomplete = {
      ...valid,
      questionType: "matching" as const,
      prompt: "وصّل كل مصطلح في العمود الأول بوصفه الصحيح من المصدر.",
      options: ["L:التسارع", "L:السرعة المتجهة", "L:الزمن", "R:معدل التغير في السرعة المتجهة", "R:كمية لها مقدار واتجاه", "R:الفترة التي يحدث خلالها التغير"],
      answer: "التسارع=>معدل التغير في السرعة المتجهة|السرعة المتجهة=>كمية لها مقدار واتجاه",
    };
    expect(validateGeneratedQuestion(incomplete, 12, source)).toBeNull();
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./CompetitionPage.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

describe("غرفة الاختبار المتدرجة", () => {
  it("تعرض سؤالاً واحداً مع مؤشر التقدم دون كشف الإجابة قبل حكم لؤي", () => {
    expect(page).toContain("CompetitionExamRoom");
    expect(page).toContain("السؤال {question.order + 1} من {match.match.questionTotal}");
    expect(page).toContain("لا يظهر التصحيح قبل الحسم");
    expect(page).toContain("لؤي بيحسم الإجابات الآن");
    expect(page).toContain("الإجابات مقفلة");
  });

  it("يفصل اختيار الإجابة عن تأكيدها ويجعل الاختيار دائرياً مرئياً", () => {
    expect(page).toContain('role="radiogroup" aria-label="اختيارات السؤال"');
    expect(page).toContain('role="radio" aria-checked={selectedOption === option}');
    expect(page).toContain("setSelectedOption(option)");
    expect(page).toContain("تأكيد الإجابة");
    expect(css).toContain(".competition-answer-option");
    expect(css).toContain(".competition-answer-radio");
    expect(css).toContain(".competition-answer-option.is-selected");
  });

  it("يدعم الإجابة المكتوبة من لوحة المفاتيح قبل إرسالها بأمان", () => {
    expect(page).toContain("اكتب إجابتك");
    expect(page).toContain("اكتب بطريقتك حتى لو بالعامية المصرية");
    expect(page).toContain("تأكيد الإجابة المكتوبة");
    expect(page).toContain("مستنيين {opponent} أو حكم لؤي");
  });

  it("يستنتج اسم الخصم من وضع المباراة ويعرض تصحيح لؤي في نتيجة الجولة", () => {
    expect(page).toContain("opponentLabelForMatch");
    expect(page).toContain('match.match.mode === "rashed" ? "راشد"');
    expect(page).toContain("CompetitionOpponentBanner");
    expect(page).toContain("خصمك: {opponent}");
    expect(page).toContain("CompetitionLoayReviewPanel");
    expect(page).toContain("لؤي · التصحيح أمامك");
  });

  it("يبقي الانتقال للسؤال التالي داخل صفحة النتيجة بعد الحسم الخادمي", () => {
    expect(page).toContain("السؤال التالي ضد راشد");
    expect(page).toContain("السؤال التالي");
    expect(page).toContain("advance.mutate({ memberSlot: member!, matchId: match.match.id })");
  });

  it("يظهر نقاش راشد السري داخل سؤال راشد فقط من دون كشف الحل", () => {
    expect(page).toContain("CompetitionRashedCoach");
    expect(page).toContain('match.match.mode !== "rashed" || match.match.status !== "question_active"');
    expect(page).toContain("راشد ما يشوفش مفتاح الإجابة هنا");
    expect(page).toContain("competition-rashed-coach-fab");
  });
});


it("يوفر إدخالاً وإخراجاً صوتياً مع بديل كتابي واضح", () => {
  expect(page).toContain("SpeechRecognition");
  expect(page).toContain("speechSynthesis");
  expect(page).toContain("تحدث صوتياً");
  expect(page).toContain("صوت راشد مفعّل");
  expect(page).toContain("المتصفح ده مش بيدعم الإدخال الصوتي");
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./CompetitionPage.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

describe("واجهة راشد وصندوق التعليلات", () => {
  it("تتيح اختيار مواجهة راشد وتوضح أن رده مخفي حتى الحسم", () => {
    expect(page).toContain("createRashedMatch");
    expect(page).toContain("منافسة ضد راشد");
    expect(page).toContain("رده متقفل لحد ما لؤي يحسم الجولة");
    expect(page).toContain("CompetitionRashedRoundResult");
    expect(page).toContain("السؤال التالي ضد راشد");
    expect(page).toContain("CompetitionRashedFinalResult");
    expect(page).toContain("لا تُضاف إلى سجل انتصارات سيف وحنين");
  });

  it("يعرض أوضاع راشد البصرية للسؤال والتقييم والنتيجة من دون كشف الرد قبل الحسم", () => {
    expect(page).toContain("CompetitionRashedPresence");
    expect(page).toContain("RASHED_STATE_IMAGES");
    expect(page).toContain("rashed-robot-question_235a41f8.png");
    expect(page).toContain("rashed-robot-thinking_fa67f223.png");
    expect(page).toContain("rashed-robot-correct_8dc32e89.png");
    expect(page).toContain("rashed-robot-incorrect_a758d83b.png");
    expect(page).toContain("rashed-robot-win_3be6ad9e.png");
    expect(page).toContain("RashedPortrait");
    expect(page).toContain("rashed-portrait-fallback");
    expect(page).toContain("useEffect(() => setFailed(false), [state])");
    expect(page).toContain('if (match.match.mode === "rashed") return null;');
    expect(page).toContain("لا تُعرض إجابة راشد ولا نتيجتها قبل إعلان حكم لؤي");
    expect(css).toContain("rashed-presence");
    expect(css).toContain("rashed-think");
    expect(css).toContain("rashed-win");
    expect(css).toContain("rashed-correct");
    expect(css).toContain("rashed-incorrect");
  });

  it("يحفظ صندوق التعليلات تلقائياً ويعرض الأرشيف في نافذة الجولة", () => {
    expect(page).toContain("CompetitionRationaleBox");
    expect(page).toContain("saveRationale");
    expect(page).toContain("بيتحفظ تلقائياً");
    expect(page).toContain("CompetitionRationaleArchivePanel");
    expect(page).toContain("صندوق الجولة");
    expect(page).toContain("تصحيح لؤي وخطوة الإصلاح");
  });

  it("يحترم تقليل الحركة عند فتح الصندوق ودخول Dash الأرشيف", () => {
    expect(css).toContain("rationale-composer");
    expect(css).toContain("rationale-open");
    expect(css).toContain("rationale-dash-in");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./CompetitionPage.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8");

describe("هيئة محرك التنافس الحية", () => {
  it("يبقى بخاراً ظاهراً داخل صفحة المحرك ويبدأ صوت الدخول مرة واحدة ثم يُنظّف عند الخروج", () => {
    expect(page).toContain("CompetitionEngineMotion");
    expect(page).toContain("ENGINE_START_SOUND_URL");
    expect(page).toContain("void player.play().then(() => setSoundOn(true)).catch(() => setSoundOn(false))");
    expect(page).toContain("return () => { player.pause(); player.currentTime = 0; };");
    expect(page).toContain("competition-engine-motion is-present");
    expect(page).toContain("تشغيل صوت المحرك");
    expect(page).toContain("onClick={() => { if (soundOn)");
    expect(page).toContain("engine-steam steam-one");
  });

  it("يوقف الحركة غير الضرورية حين يطلب الجهاز تقليل الحركة", () => {
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("competition-engine-motion");
    expect(styles).toContain("competition-engine-motion.is-present .engine-steam");
    expect(styles).toContain("@keyframes engine-steam");
  });

  it("يغيّر مستوى البخار من حالة الجولة وصعوبة السؤال ويعرض استعداد راشد بلا نتيجة مسبقة", () => {
    expect(page).toContain("const difficulty = match?.question?.difficulty ?? engine?.difficulty ?? 1");
    expect(page).toContain("const progress = match?.question ? (match.question.order + 1) / Math.max(1, match.match.questionTotal) : 0");
    expect(page).toContain('steamLevel = !engine ? "idle"');
    expect(page).toContain("steam-${steamLevel}");
    expect(page).toContain("showRashedCue={competitionMode === \"rashed\" || match?.match.mode === \"rashed\"}");
    expect(page).toContain("رده يظل مخفياً حتى يحسم لؤي الجولة.");
    expect(styles).toContain(".competition-engine-motion.steam-active .engine-steam");
    expect(styles).toContain(".competition-engine-motion.steam-hot .engine-steam");
    expect(styles).toContain(".engine-rashed-cue");
    expect(styles).toContain("engine-rashed-ready");
  });
});

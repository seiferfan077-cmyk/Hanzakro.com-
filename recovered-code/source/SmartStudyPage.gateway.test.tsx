import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./SmartStudyPage.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8");

describe("بوابة الدراسة الذكية", () => {
  it("تعرض ثلاث بطاقات فقط في المدخل وتفتح القسم المختار مباشرةً", () => {
    expect(page).toContain("SmartStudyGateway");
    expect(page).toContain("خطّط ونفّذ");
    expect(page).toContain("افهم وثبّت");
    expect(page).toContain("اختبر وراجع");
    expect(page).toContain("المحتوى الطويل مقسوم على الثلاث بطاقات تحت");
    expect(page).toContain("رجوع للبطاقات الثلاث");
    expect(page).toContain("ArrowRight size={16}");
    expect(page).toContain("رجوع إلى بطاقات الدراسة الذكية");
    expect(page).toContain('{smartRoute === "plan" ? <>');
    expect(page).toContain('{smartRoute === "understand" ? <>');
    expect(page).toContain('{smartRoute === "practice" ? <>');
    expect(page).toContain('id="smart-study-entry"');
    expect(page).toContain("returnToCards");
    expect(page).toContain('target?.focus({ preventScroll: true })');
    expect(page).toContain('target?.scrollIntoView({ block: "start", behavior: "smooth" })');
  });

  it("يحافظ على بطاقات عائمة متجاوبة وتحترم تقليل الحركة", () => {
    expect(styles).toContain(".smart-study-gateway");
    expect(styles).toContain(".smart-study-route-card");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

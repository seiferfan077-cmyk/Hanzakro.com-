import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "components/PlatformSectionsBar.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "index.css"), "utf8");

describe("PlatformSectionsBar customization", () => {
  it("يحفظ ترتيب الشريط ويدعم الضغط المطول والسحب داخله", () => {
    expect(source).toContain("haneenstudy-platform-sections-order-v1");
    expect(source).toContain("onPointerDown");
    expect(source).toContain("setTimeout");
    expect(source).toContain("onPointerMove");
    expect(source).toContain("data-section-path");
    expect(source).toContain("setLocation(section.path)");
  });
  it("يوفر بديلاً بلوحة المفاتيح وحالة بصرية للسحب", () => {
    expect(source).toContain("event.altKey && event.shiftKey");
    expect(source).toContain("ArrowLeft");
    expect(css).toContain("platform-sections-sortable.is-sorting");
    expect(css).toContain("platform-sections-item.is-dragging");
    expect(css).toContain("prefers-reduced-motion");
  });
  it("يدخل وضع تعديل واضحاً ويتيح اختيار الأيقونة وتحريكها أو تبديلها", () => {
    expect(source).toContain("isEditMode");
    expect(source).toContain("beginEditMode");
    expect(source).toContain("platform-sections-edit-panel");
    expect(source).toContain("selectOrSwap");
    expect(source).toContain("swapSections");
    expect(source).toContain("حرّك الأيقونة المختارة ناحية اليمين");
    expect(source).toContain("حرّك الأيقونة المختارة ناحية اليسار");
    expect(css).toContain("platform-sections-sortable.is-edit-mode");
  });
  it("يعرض حركة ناعمة وحفظاً احتفالياً عند تثبيت ترتيب التعديل", () => {
    expect(source).toContain("animateOrderChange");
    expect(source).toContain("saveEditMode");
    expect(source).toContain("حفظ الترتيب");
    expect(source).toContain("platform-sections-save-celebration");
    expect(css).toContain("platformEditNudge");
    expect(css).toContain("platformSaveHeart");
  });
  it("يخفف تبديل الأيقونات أثناء السحب ويمنع إعادة التبديل المتكررة على الهدف نفسه", () => {
    expect(source).toContain("lastSwapTargetRef");
    expect(source).toContain("translate3d");
    expect(source).toContain("duration: 380");
    expect(source).toContain("swapSections(source, target)");
    expect(css).toContain("will-change: transform");
  });
  it("يفتح محرر الترتيب كواجهة مركزية مموهة مع إعادة ضبط وصوت حفظ اختياري", () => {
    expect(source).toContain("platform-sections-edit-modal");
    expect(source).toContain("resetOrder");
    expect(source).toContain("إعادة ضبط");
    expect(source).toContain("playRomanticChime");
    expect(css).toContain("backdrop-filter: blur(7px)");
    expect(css).toContain("اضغط مطوّلاً للتعديل");
  });
});

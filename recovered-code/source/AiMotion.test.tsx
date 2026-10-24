import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const boardSupport = readFileSync(new URL("./BoardSupport.tsx", import.meta.url), "utf8");
const floatingAssistant = readFileSync(new URL("./FloatingAssistant.tsx", import.meta.url), "utf8");
const imageSummary = readFileSync(new URL("./ChatImageSummaryComposer.tsx", import.meta.url), "utf8");

describe("حركة تجربة الذكاء الاصطناعي", () => {
  it("تعرّف حركة دخول للتنبيهات وحركة لمعان للتحميل مع حماية تقليل الحركة", () => {
    expect(styles).toContain(".ai-alert-enter");
    expect(styles).toContain(".ai-loading-surface::after");
    expect(styles).toContain(".ai-loading-dots::after");
    expect(styles).toContain("[data-sonner-toast]");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("تربط حالات التحميل الفعلية بمؤشر وصول في مساعدي الذكاء الاصطناعي", () => {
    expect(boardSupport).toContain("ai-loading-surface");
    expect(boardSupport).toContain("ai-loading-dots");
    expect(floatingAssistant).toContain('role="status" aria-live="polite"');
    expect(floatingAssistant).toContain("ai-loading-surface");
    expect(imageSummary).toContain('aria-busy={pending}');
    expect(imageSummary).toContain("ai-loading-dots");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const assistant = readFileSync(new URL("./FloatingAssistant.tsx", import.meta.url), "utf8");
const presence = readFileSync(new URL("./GeneralFloatingBar.tsx", import.meta.url), "utf8");
const call = readFileSync(new URL("./VoiceCallBar.tsx", import.meta.url), "utf8");
const files = readFileSync(new URL("./FloatingFilesViewer.tsx", import.meta.url), "utf8");

describe("نوافذ أدوات الشريط", () => {
  it("يوفر لكل نافذة مقبض سحب منفصلاً فلا يتعارض مع إدخال المستخدم أو أزراره", () => {
    expect(assistant).toContain("useFloatingWindow");
    expect(assistant).toContain('aria-label="تحريك نافذة لؤي"');
    expect(presence).toContain('aria-label="تحريك نافذة إحنا فين"');
    expect(presence).toContain("saf-haneen-presence-window-layout");
    expect(call).toContain('aria-label="تحريك نافذة المكالمة"');
    expect(call).toContain("saf-haneen-voice-call-window-layout-v1");
    expect(files).toContain('aria-label="تحريك نافذة كتبي"');
    expect(files).toContain("saf-haneen-floating-files-menu-layout-v1");
  });
});

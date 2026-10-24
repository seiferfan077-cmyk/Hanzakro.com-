import { describe, expect, it } from "vitest";
import { defaultPronunciationSettings, normalizePronunciationText, speechRecognitionSupported, speechSynthesisSupported } from "./pronunciationEngine";

describe("PronunciationEngine", () => {
  it("يبدأ بإعدادات تعليمية محفوظة منطقياً", () => {
    expect(defaultPronunciationSettings).toMatchObject({ accent: "en-US", rate: 0.8, repeatCount: 1, autoPronunciation: "off" });
  });
  it("ينظف ناتج المقارنة التقريبية بدون ادعاء نسبة دقة علمية", () => {
    expect(normalizePronunciationText(" Environment! ")).toBe("environment");
    expect(normalizePronunciationText("hello, world")).toBe("hello world");
  });
  it("لا يكسر التطبيق عندما لا تكون واجهات الصوت متاحة في بيئة الخادم", () => {
    expect(speechSynthesisSupported()).toBe(false);
    expect(speechRecognitionSupported()).toBe(false);
  });
});

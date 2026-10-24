import { afterEach, describe, expect, it, vi } from "vitest";
import { LOAY_EXAM_RESEARCH_MINIMUM_SOURCES, LOAY_RESEARCH_MINIMUM_SOURCES, needsWebResearch, researchWeb } from "./webResearch";

describe("تخطيط بحث لؤي على الويب", () => {
  it("يفتح البحث للأسئلة الرسمية والحديثة ولا يفتحها لشرح من سياق موجود", () => {
    expect(needsWebResearch("ما أحدث قرار رسمي من وزارة التعليم؟")).toBe(true);
    expect(needsWebResearch("اشرحلي القانون اللي في الملاحظة دي")).toBe(false);
  });

  it("يجمع 20 مصدراً فريداً على الأقل للبحث العادي و30 لبنك الامتحان", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || "{}")) as { query?: string; urls?: string[] };
      if (body.query) {
        const batch = body.query.includes("شرح") ? "b" : "a";
        return { ok: true, json: async () => ({ results: Array.from({ length: 20 }, (_, index) => ({ title: `مصدر ${batch}-${index + 1}`, url: `https://${batch}${index + 1}.example.edu/unit`, content: `محتوى ${index + 1}` })) }) } as Response;
      }
      return { ok: true, json: async () => ({ results: (body.urls ?? []).map(url => ({ url, raw_content: `تفصيل ${url}` })) }) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    const regular = await researchWeb("النحو العربي", { minimumSources: LOAY_RESEARCH_MINIMUM_SOURCES });
    const exam = await researchWeb("النحو العربي", { minimumSources: LOAY_EXAM_RESEARCH_MINIMUM_SOURCES, purpose: "exam" });
    expect(regular.sources).toHaveLength(20);
    expect(exam.sources).toHaveLength(30);
    expect(new Set(exam.sources.map(source => source.url)).size).toBe(30);
    expect(exam.requiredSources).toBe(30);
  });

  it("يرفض البحث الناقص بدلاً من عرض عدد أقل من الحد المطلوب", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ results: Array.from({ length: 19 }, (_, index) => ({ title: `مصدر ${index}`, url: `https://source-${index}.example.edu`, content: "نص" })) }) }) as Response));
    await expect(researchWeb("درس تجريبي", { minimumSources: 20 })).rejects.toThrow("19 مصدر موثوق فقط من أصل 20");
  });
});

afterEach(() => vi.unstubAllGlobals());

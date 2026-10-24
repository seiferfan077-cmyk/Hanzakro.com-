import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./competitionSourceInsights.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

describe("تحليل مصادر المنافسة", () => {
  it("يطلب بنية منظمة ويقبل الموضوعات والمفاهيم ذات الاقتباس المطابق للّقطة فقط", () => {
    expect(schema).toContain("competition_source_insight_unique");
    expect(source).toContain("hasEvidence");
    expect(source).toContain("evidenceQuote");
    expect(source).toContain("نص المصدر فقط");
    expect(source).toContain("لا تضف معرفة خارج النص");
  });
});

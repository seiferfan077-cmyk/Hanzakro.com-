import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./competitionEngineDb.ts", import.meta.url), "utf8");

describe("مصادر ويب المحرك التنافسي", () => {
  it("يبحث ويستخرج عبر خدمة البحث ثم يحفظ فقط المصدر الذي اختاره المستخدم كلقطة URL", () => {
    expect(source).toContain("researchWeb");
    expect(source).toContain("searchCompetitionWebSources");
    expect(source).toContain("addCompetitionWebSource");
    expect(source).toContain('sourceType: "url"');
    expect(source).toContain("contentSnapshot: source.content");
  });
});

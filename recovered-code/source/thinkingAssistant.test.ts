import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("وضع تفكير لؤي", () => {
  it("يستخدم نموذجاً يدعم الاستدلال ولا يعرض سلسلة التفكير ويلتزم بحد زمني", () => {
    const source = readFileSync("server/thinkingAssistant.ts", "utf8");
    expect(source).toContain('model: "gpt-5-mini"');
    expect(source).toContain('reasoning: { effort: "medium" }');
    expect(source).toContain("LOAY_THINKING_MINIMUM_MS = 25_000");
    expect(source).toContain("waitForMinimumLoayThinking(startedAt)");
    expect(source).toContain("لا تعرض سلسلة التفكير الداخلية");
  });
});

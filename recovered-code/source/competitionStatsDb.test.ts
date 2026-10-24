import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./competitionStatsDb.ts", import.meta.url), "utf8");

describe("إحصاءات المنافسة", () => {
  it("تبدأ من نتائج المكتمل فقط وتحسب الدقة ومتوسط زمن الإجابة", () => {
    expect(source).toContain("competitionMatchResults");
    expect(source).toContain("averageResponseSeconds");
    expect(source).toContain("player.accuracy");
    expect(source).toContain("completedMatches: results.length");
    expect(source).toContain('eq(competitionMatches.mode, "duel")');
    expect(source).toContain("engineSubjectNameSnapshot");
  });
});

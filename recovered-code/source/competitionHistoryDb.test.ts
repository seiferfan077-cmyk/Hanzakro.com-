import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./competitionHistoryDb.ts", import.meta.url), "utf8");

describe("سجل المنافسات", () => {
  it("يبني عدّاد الانتصارات من نتائج مباريات مكتملة مخزنة فقط", () => {
    expect(source).toContain("competitionMatchResults");
    expect(source).toContain("wins[result.winnerSlot");
    expect(source).toContain("completedCount: duelResults.length");
    expect(source).toContain('matches.find(match => match.id === result.matchId)?.mode === "duel"');
    expect(source).toContain("engineTitleSnapshot");
    expect(source).toContain('const COMPETITION_TIMEOUT_ANSWER = "__competition_timeout__"');
    expect(source).toContain("timedOutSessionCount");
    expect(source).toContain("timedOutQuestionCount");
    expect(source).toContain("answer.answerText === COMPETITION_TIMEOUT_ANSWER");
  });
});

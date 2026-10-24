import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const matchService = readFileSync(new URL("./competitionMatchDb.ts", import.meta.url), "utf8");
const router = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

describe("صندوق التعليلات المؤرشف", () => {
  it("يحفظ تعليل اللاعب للسؤال النشط فقط ويحدثه بدلاً من تكرار صندوق الجولة", () => {
    expect(matchService).toContain("saveCompetitionMatchRationale");
    expect(matchService).toContain('match.status !== "question_active"');
    expect(matchService).toContain("onDuplicateKeyUpdate");
    expect(schema).toContain("competition_rationale_round_author_unique");
  });

  it("يعرض صناديق الجولات المنتهية بصفحات ويضم خصم الجولة وتعليلها وتصحيح لؤي", () => {
    expect(matchService).toContain("listCompetitionRationaleArchive");
    expect(matchService).toContain('eq(competitionMatchQuestions.status, "evaluated")');
    expect(matchService).toContain("nextBeforeRound");
    expect(matchService).toContain("opponentKey");
    expect(matchService).toContain("loayReview");
    expect(router).toContain("rationaleArchive");
    expect(router).toContain("saveRationale");
  });
});

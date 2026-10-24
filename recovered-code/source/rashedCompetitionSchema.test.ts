import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../drizzle/0072_faithful_blue_blade.sql", import.meta.url), "utf8");

describe("نموذج راشد وصناديق التعليلات", () => {
  it("يفصل نمط راشد عن عضوية سيف وحنين ويحتفظ بسجل لكل جولة", () => {
    expect(schema).toContain('competitionMatchModeValues = ["duel", "rashed"]');
    expect(schema).toContain('competitionMatchRationales');
    expect(schema).toContain('competitionRashedTurns');
    expect(schema).toContain('competition_rationale_round_author_unique');
    expect(schema).toContain('rashedPoints');
  });

  it("يضيف الجداول والحقول من دون عمليات حذف أو تغيير مُفقد للبيانات", () => {
    expect(migration).toContain('CREATE TABLE `competitionMatchRationales`');
    expect(migration).toContain('CREATE TABLE `competitionRashedTurns`');
    expect(migration).toContain('ALTER TABLE `competitionMatches` ADD `mode`');
    expect(migration).not.toMatch(/\bDROP\b|\bDELETE\b|\bTRUNCATE\b/i);
  });
});

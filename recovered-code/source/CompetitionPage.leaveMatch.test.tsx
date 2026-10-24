import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./CompetitionPage.tsx", import.meta.url), "utf8");
const history = readFileSync(new URL("../../../server/competitionHistoryDb.ts", import.meta.url), "utf8");

describe("خروج المنافسة وسجل النتائج", () => {
  it("يعرض زر خروج مع تأكيد ولا ينفذ الإجراء قبل التأكيد", () => {
    expect(page).toContain("CompetitionLeaveControl");
    expect(page).toContain("الخروج من المنافسة");
    expect(page).toContain("تأكيد الخروج");
    expect(page).toContain("leave.mutate({ memberSlot: member, matchId: match.match.id })");
    expect(page).toContain("تم إلغاء الدعوة قبل بدء المنافسة، ولم تُحسب جلسة");
  });

  it("يعرض سجل الجلسات الفعلية والفائز والخاسر وملخص صندوق التعليلات تحت كل نتيجة", () => {
    expect(page).toContain("جلسات فعلية ونتائج محفوظة");
    expect(page).toContain("الفائز:");
    expect(page).toContain("الخاسر:");
    expect(page).toContain("CompetitionSessionRationalePreview");
    expect(page).toContain("صندوق التعليلات وتصحيح لؤي");
    expect(history).toContain("sessionCount");
    expect(history).toContain("sessionItems");
    expect(history).toContain("completionReason");
  });
});

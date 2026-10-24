import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./competitionMatchDb.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

describe("غرفة منافسة لؤي", () => {
  it("تتحقق من عضوية اللاعب ولا تقرأ مفتاح الإجابة ضمن حالة السؤال المعروضة", () => {
    expect(source).toContain("async function requirePlayer");
    expect(source).not.toContain("answerJson");
    expect(source).toContain("answerStates");
  });

  it("تمنع الإجابة المكررة وتحوّل الجولة للتقييم بعد إجابتين في الثنائية أو بعد إجابة اللاعب ورد راشد", () => {
    expect(schema).toContain("competition_match_answer_member_unique");
    expect(source).toContain("idempotencyKey");
    expect(source).toContain('count.length === (match.mode === "rashed" ? 1 : 2)');
    expect(source).toContain("competitionRashedTurns");
    expect(source).toContain('status: "evaluating"');
  });

  it("يربط السؤال بصورة المصدر التعليمية فقط عندما يكون المصدر صورة، من دون مفتاح الإجابة", () => {
    expect(source).toContain("competitionEngineSources");
    expect(source).toContain('question.sourceType === "image" ? question.sourceUrl : null');
    expect(source).not.toContain("answerJson");
  });

  it("يثبت موعد السؤال اختيارياً ويحسم الغائب خادمياً عند انتهاء الوقت قبل التقييم", () => {
    expect(schema).toContain("questionTimeLimitSeconds");
    expect(schema).toContain("deadlineAt");
    expect(source).toContain("settleCompetitionQuestionDeadline");
    expect(source).toContain("COMPETITION_TIMEOUT_ANSWER");
    expect(source).toContain("deadlineAt <=");
    expect(source).toContain('status: "evaluating"');
  });

  it("يسجل الانقطاع ويعيد اللاعب لنفس حالة الغرفة من غير إلغاء المباراة", () => {
    expect(source).toContain("touchCompetitionPresence");
    expect(source).toContain('state: "disconnected"');
    expect(source).toContain('const resumedState = player.state === "disconnected"');
    expect(source).toContain('match.status) ? "ready" : "joined"');
  });

  it("يفصل الخروج المؤكد عن الانقطاع والدعوة غير المقبولة، ويحفظ فائز الانسحاب فقط بعد بدء المنافسة", () => {
    expect(source).toContain("leaveCompetitionMatch");
    expect(source).toContain("الدعوة غير المقبولة لا تحتاج خروجاً ولا تُحسب منافسة");
    expect(source).toContain('kind: "cancelled_before_start"');
    expect(source).toContain('completionReason: "forfeit"');
    expect(source).toContain("forfeitedBy: input.member");
    expect(source).toContain('status: "finished"');
    expect(schema).toContain("completionReason");
    expect(schema).toContain("forfeitedBy");
  });

  it("لا يمنع اللاعب من بدء غرفة بسبب مباراة تخص الطرف الآخر، لكنه يحميه من تكرار مباراته هو", () => {
    expect(source).toContain("const activeForMember");
    expect(source).toContain("competitionMatchPlayers.memberSlot, input.member");
    expect(source).toContain("const engagedPlayerStates");
    expect(source).toContain("inArray(competitionMatchPlayers.state, engagedPlayerStates)");
    expect(source).toContain('if (item.state === "invited") continue;');
    expect(source).toContain("listPendingCompetitionInvitations");
    expect(source).toContain('eq(competitionMatchPlayers.state, "invited")');
    expect(source).toContain("عندك مباراة قائمة بالفعل");
    expect(source).toContain("لا تحتاج لحذفها أو إنهائها لفتح الشاشة");
    expect(source).not.toContain("SELECT id FROM competitionMatches WHERE status IN");
  });
});

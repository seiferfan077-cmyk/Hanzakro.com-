import { describe, expect, it } from "vitest";
import { redactRashedCoachReply } from "./competitionRashedCoach";

describe("محادثة راشد السرية", () => {
  it("تستبدل أي رد يكشف الإجابة بتوجيه آمن", () => {
    expect(redactRashedCoachReply("الإجابة الصحيحة هي أ")).toContain("مش هقول الحل");
  });

  it("تسمح بتوجيه عام لا يحدد الإجابة", () => {
    expect(redactRashedCoachReply("ركّز في الفكرة الأساسية وقارنها بالشرط المذكور في السؤال.")).toContain("ركّز في الفكرة الأساسية");
  });
});

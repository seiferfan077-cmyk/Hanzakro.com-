import { describe, expect, it } from "vitest";
import { buildTomorrowPlanEvidence } from "./tomorrowStudyPlan";

describe("مؤشرات اقتراح خطة الغد", () => {
  it("يحسب نسبة الإنجاز ووقت التركيز من القيم الفعلية فقط", () => {
    expect(buildTomorrowPlanEvidence({ dayKey: "2026-08-26", taskCount: 5, completedTaskCount: 3, saifMinutes: 25, haneenMinutes: 40, goalCount: 2, activeSessionCount: 1 })).toEqual({ completion: 60, totalFocusMinutes: 65, taskCount: 5, completedTaskCount: 3, goalCount: 2, activeSessionCount: 1 });
  });

  it("لا يخترع نسبة إنجاز عندما لا توجد مهام", () => {
    expect(buildTomorrowPlanEvidence({ dayKey: "2026-08-26", taskCount: 0, completedTaskCount: 0, saifMinutes: 0, haneenMinutes: 0, goalCount: 0, activeSessionCount: 0 }).completion).toBe(0);
  });
});

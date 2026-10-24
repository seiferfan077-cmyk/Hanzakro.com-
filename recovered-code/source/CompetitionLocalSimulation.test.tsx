import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOCAL_SIMULATION_QUESTIONS, scoreLocalSimulationAnswer } from "./CompetitionLocalSimulation";

const source = readFileSync(new URL("./CompetitionLocalSimulation.tsx", import.meta.url), "utf8");
const competitionPage = readFileSync(new URL("../pages/CompetitionPage.tsx", import.meta.url), "utf8");

describe("المحاكاة المحلية لمباراة لؤي", () => {
  it("تحتوي على أسئلة تدريبية ثابتة وتقيّم الإجابة داخل المتصفح فقط", () => {
    expect(LOCAL_SIMULATION_QUESTIONS).toHaveLength(3);
    expect(scoreLocalSimulationAnswer(LOCAL_SIMULATION_QUESTIONS[0], 0)).toBe(1);
    expect(scoreLocalSimulationAnswer(LOCAL_SIMULATION_QUESTIONS[0], 1)).toBe(0);
    expect(source).toContain("بيانات تدريبية ثابتة");
    expect(source).toContain("لا يتم إنشاء غرفة أو حفظ نقاط أو إرسال إجابات للخادم");
  });

  it("تظهر كمحاكاة واضحة ولا تستورد tRPC أو تنفذ mutation", () => {
    expect(source).toContain('data-local-simulation');
    expect(source).toContain("محاكاة فقط");
    expect(source).not.toContain("trpc");
    expect(source).not.toContain("mutate");
    expect(competitionPage).toContain("<CompetitionLocalSimulation />");
  });
});

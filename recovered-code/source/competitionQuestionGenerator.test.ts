import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCompetitionSourceQuestionPlan } from "./competitionQuestionGenerator";

const source = readFileSync(new URL("./competitionQuestionGenerator.ts", import.meta.url), "utf8");

describe("سياق مولد أسئلة المنافسة", () => {
  it("يمرر المادة والصف والوحدة والدرس كسياق ويأمر النموذج بالالتزام بلقطة المصدر فقط", () => {
    expect(source).toContain("سياق المحرك");
    expect(source).toContain("engine.subjectName");
    expect(source).toContain("استخدم المصدر المعطى فقط");
  });

  it("يخصّص غالبية البنك للمصدر الأساسي ويمنح المصادر المساعدة نصيباً عند كفاية العدد", () => {
    const plan = buildCompetitionSourceQuestionPlan([{ id: 11, isPrimary: false }, { id: 22, isPrimary: true }, { id: 33, isPrimary: false }], 8);
    expect(plan).toEqual([{ sourceId: 11, count: 2 }, { sourceId: 22, count: 5 }, { sourceId: 33, count: 1 }]);
    expect(plan.reduce((total, item) => total + item.count, 0)).toBe(8);
  });

  it("يتبع توزيعاً متوازناً واضحاً عند عدم تعيين مصدر أساسي", () => {
    expect(buildCompetitionSourceQuestionPlan([{ id: 11, isPrimary: false }, { id: 22, isPrimary: false }], 5)).toEqual([{ sourceId: 11, count: 3 }, { sourceId: 22, count: 2 }]);
  });

  it("يتعامل مع المصادر القصيرة كمعلومات دعم ولا يجعلها توقف بنكاً له مصدر مقروء", () => {
    expect(source).toContain("const readableSources = sources.filter");
    expect(source).toContain("minimumQuestionSourceCharacters");
    expect(source).toContain("لن نخترع أسئلة من مصدر غير مقروء");
  });

  it("يقسم الطلبات الأكبر من أربع أسئلة إلى دفعات متوافقة مع مخطط الاستجابة ويوقف الطلب المتأخر", () => {
    expect(source).toContain("const maximumQuestionsPerRequest = 4");
    expect(source).toContain("Math.ceil(count / maximumQuestionsPerRequest)");
    expect(source).toContain("const questionGenerationTimeoutMs = 75_000");
    expect(source).toContain("لم يُحفظ بنك جزئي");
  });

  it("يستخدم حد إخراج GPT الصحيح ويتسامح مع تغليف JSON دون قبول صيغة غير منظمة", () => {
    expect(source).toContain("maxCompletionTokens: 3000");
    expect(source).toContain("function parseCompetitionQuestions");
    expect(source).toContain("replace(/^```(?:json)?\\s*/i");
  });

  it("يعيد طلب الأسئلة الموثقة الناقصة ويمنع تكرار صيغ السؤال قبل الحفظ", () => {
    expect(source).toContain("const maximumQuestionGenerationAttempts = 4");
    expect(source).toContain("الأسئلة المستبعدة لتجنب التكرار");
    expect(source).toContain("existingPrompts: generated.map(question => question.prompt)");
  });
});

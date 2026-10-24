import { describe, expect, it } from "vitest";
import { decideLoayWork, hasLoayExamIntent, shouldResearchForLoayExam, shouldUseLoayReasoning } from "./loayExam";

describe("Loay exam intent and automatic work", () => {
  it("يلتقط طلب الامتحان باللهجة المصرية من غير زر إضافي", () => {
    expect(hasLoayExamIntent("لؤي اختبرني في البلاغة")).toBe(true);
    expect(hasLoayExamIntent("عايزة امتحان من الصور دي")).toBe(true);
    expect(hasLoayExamIntent("اشرحلي الدرس ده")).toBe(false);
  });

  it("يفعّل التفكير تلقائياً للأسئلة التي تحتاج تحليلاً أو تعليلاً", () => {
    expect(shouldUseLoayReasoning("فسر ليه التفاعل ده حصل")).toBe(true);
    expect(shouldUseLoayReasoning("قارن بين التشبيه والاستعارة")).toBe(true);
    expect(shouldUseLoayReasoning("قول لي مساء الخير")).toBe(false);
  });

  it("يبقي الأزرار اليدوية قادرة على فرض التفكير أو البحث", () => {
    expect(decideLoayWork("موضوع بسيط", true, false)).toMatchObject({ useThinking: true, useWeb: false, mode: "thinking" });
    expect(decideLoayWork("موضوع بسيط", false, true)).toMatchObject({ useThinking: false, useWeb: true, mode: "research" });
  });

  it("لا يبحث لمجرد وجود صورة؛ يبحث عند الحاجة أو اختيار المستخدم", () => {
    expect(shouldResearchForLoayExam("المفعول به", "صورة فيها شرح القاعدة", false)).toBe(false);
    expect(shouldResearchForLoayExam("آخر قرار رسمي عن المنهج", "صورة إعلان", false)).toBe(true);
    expect(shouldResearchForLoayExam("المفعول به", "صورة فيها شرح القاعدة", true)).toBe(true);
  });
});

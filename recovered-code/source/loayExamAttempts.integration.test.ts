import { inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { loayExamAttempts } from "../drizzle/schema";
import { getDb } from "./db";
import { completeLoayExamAttempt, getLatestResumableLoayExamAttempt, saveLoayExamAttempt } from "./loayExamAttempts";

const questions = [
  { id: "subject-1", type: "choice" as const, prompt: "ما علامة رفع المبتدأ؟", options: ["الضمة", "الفتحة"], correctAnswer: "الضمة", rubric: "اختيار علامة الرفع الصحيحة.", explanation: "المبتدأ المرفوع علامته الأصلية الضمة." },
  { id: "subject-2", type: "short" as const, prompt: "اكتب مثالاً لمبتدأ.", options: [], correctAnswer: "العلم نور", rubric: "ذكر تركيب يبدأ باسم مرفوع.", explanation: "المبتدأ اسم مرفوع يأتي في بداية الجملة الاسمية." },
];

const waitForNextTimestamp = () => new Promise(resolve => setTimeout(resolve, 1100));

describe("Loay exam attempt persistence integration", () => {
  it("keeps each member's saved attempt isolated, resumes answers and position, and retires a graded attempt", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const haneenAttemptId = `loay-test-h-${suffix}`;
    const saifAttemptId = `loay-test-s-${suffix}`;
    const result = { evaluations: questions.map(question => ({ id: question.id, score: 1, feedback: "إجابة اختبارية صحيحة." })), score: 2, total: 2, percentage: 100 };

    try {
      await saveLoayExamAttempt({ id: haneenAttemptId, memberSlot: "haneen", title: "اختبار عزل حنين", questions, answers: { "subject-1": "الفتحة" }, activeIndex: 0, status: "active" });
      await waitForNextTimestamp();
      await saveLoayExamAttempt({ id: saifAttemptId, memberSlot: "saif", title: "اختبار استئناف سيف", questions, answers: { "subject-1": "الضمة" }, activeIndex: 0, status: "active" });

      const saifInitial = await getLatestResumableLoayExamAttempt("saif");
      const haneenInitial = await getLatestResumableLoayExamAttempt("haneen");
      expect(saifInitial?.id).toBe(saifAttemptId);
      expect(saifInitial?.answers["subject-1"]).toBe("الضمة");
      expect(haneenInitial?.id).toBe(haneenAttemptId);
      expect(haneenInitial?.id).not.toBe(saifAttemptId);

      await waitForNextTimestamp();
      await saveLoayExamAttempt({ id: saifAttemptId, memberSlot: "saif", title: "اختبار استئناف سيف", questions, answers: { "subject-1": "الضمة", "subject-2": "الطالب مجتهد" }, activeIndex: 1, status: "paused" });

      const resumedSaif = await getLatestResumableLoayExamAttempt("saif");
      expect(resumedSaif).toMatchObject({ id: saifAttemptId, memberSlot: "saif", activeIndex: 1, status: "paused", answers: { "subject-1": "الضمة", "subject-2": "الطالب مجتهد" } });

      await completeLoayExamAttempt({ id: saifAttemptId, memberSlot: "saif", result });
      const gradedRow = await db.select({ status: loayExamAttempts.status, resultJson: loayExamAttempts.resultJson }).from(loayExamAttempts).where(inArray(loayExamAttempts.id, [saifAttemptId]));
      expect(gradedRow).toHaveLength(1);
      expect(gradedRow[0]).toMatchObject({ status: "graded", resultJson: JSON.stringify(result) });

      const afterGrading = await getLatestResumableLoayExamAttempt("saif");
      expect(afterGrading?.id).not.toBe(saifAttemptId);
    } finally {
      await db.delete(loayExamAttempts).where(inArray(loayExamAttempts.id, [saifAttemptId, haneenAttemptId]));
    }
  }, 20000);
});

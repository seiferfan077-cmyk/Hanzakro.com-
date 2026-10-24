import { createGroqCompletion } from "./groq";

type TomorrowPlanSignals = {
  dayKey: string;
  taskCount: number;
  completedTaskCount: number;
  saifMinutes: number;
  haneenMinutes: number;
  goalCount: number;
  activeSessionCount: number;
};

export function buildTomorrowPlanEvidence(signals: TomorrowPlanSignals) {
  const completion = signals.taskCount ? Math.round((signals.completedTaskCount / signals.taskCount) * 100) : 0;
  return { completion, totalFocusMinutes: signals.saifMinutes + signals.haneenMinutes, taskCount: signals.taskCount, completedTaskCount: signals.completedTaskCount, goalCount: signals.goalCount, activeSessionCount: signals.activeSessionCount };
}

export async function generateTomorrowStudyPlan(input: TomorrowPlanSignals & { memberName: string }) {
  const evidence = buildTomorrowPlanEvidence(input);
  const prompt = `أنت لؤي، مساعد مذاكرة بالمصري لسيف وحنين. اكتب اقتراحاً قصيراً قابل للتعديل لخطة بكرة، وليس جدولاً محفوظاً ولا مهاماً تم إنشاؤها. استخدم المؤشرات الفعلية فقط ولا تخمّن مادة أو درساً أو درجة. لا تقل إنك حللت أكثر من البيانات التالية.

مؤشرات اليوم ${input.dayKey}:
- المهام: ${evidence.completedTaskCount} من ${evidence.taskCount} (${evidence.completion}%)
- تركيز سيف: ${input.saifMinutes} دقيقة
- تركيز حنين: ${input.haneenMinutes} دقيقة
- أهداف نشطة: ${evidence.goalCount}
- جلسات قائمة وقت الطلب: ${evidence.activeSessionCount}

أعطِ: عنواناً قصيراً، 3 خطوات زمنية مرنة، ونقطة مراجعة في النهاية. إذا لم توجد مهام أو تركيز كافٍ، اقترح بداية صغيرة من غير افتراض مادة. لا تذكر أرقاماً غير موجودة. اجعل الرد بين 120 و220 كلمة.`;
  const plan = await createGroqCompletion([{ role: "system", content: "اتكلم بالمصري الطبيعي وبشكل داعم. لا تدّع أنك أنشأت مهمة أو عدّلت خطة؛ أنت تقترح فقط." }, { role: "user", content: `المستخدم الحالي: ${input.memberName}\n${prompt}` }], 750);
  return { plan, evidence };
}

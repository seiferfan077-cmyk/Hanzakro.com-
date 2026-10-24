import { invokeLLM } from "./_core/llm";
import { educationalSystemPrompt } from "./studyAssistant";
import type { WebResearchSource } from "./webResearch";

export const LOAY_THINKING_MINIMUM_MS = 25_000;
export async function waitForMinimumLoayThinking(startedAt: number, minimumMs = LOAY_THINKING_MINIMUM_MS) { const remaining = Math.max(0, minimumMs - (Date.now() - startedAt)); if (remaining) await new Promise<void>(resolve => setTimeout(resolve, remaining)); }

export async function askLoayWithReasoning(input: { question: string; memberName?: string; subjectName?: string; lessonTitle?: string; memorySummary?: string; history?: Array<{ role: "user" | "assistant"; content: string }>; webSources?: WebResearchSource[] }) {
  const startedAt = Date.now();
  const context = [input.memberName ? `الطالب: ${input.memberName}.` : "الطالب غير محدد.", input.subjectName ? `المادة: ${input.subjectName}.` : "لا توجد مادة محددة.", input.lessonTitle ? `الدرس: ${input.lessonTitle}.` : "لا يوجد درس محدد."].join("\n");
  const sources = input.webSources?.length ? `\nمصادر الويب المتاحة لهذه الإجابة فقط:\n${input.webSources.map((source, index) => `[${index + 1}] ${source.title}\n${source.url}\n${source.content}`).join("\n\n")}\nاذكر المصادر في آخر الإجابة تحت عنوان «المصادر»، ولا تضف رابطاً غير موجود.` : "";
  const result = await invokeLLM({ model: "gpt-5-mini", reasoning: { effort: "medium" }, maxCompletionTokens: 1200, messages: [{ role: "system", content: `${educationalSystemPrompt}\nوضع التفكير مفعّل فعلاً لتحليل السؤال قبل الإجابة. لا تعرض سلسلة التفكير الداخلية أو خطوات الاستدلال الخفية؛ أعطِ بدلاً منها شرحاً قصيراً ومنظماً يمكن للطالب مراجعته. لا تصل إلى أي بيانات غير مرسلة. ${input.memorySummary ? `ذاكرة مساعدة: ${input.memorySummary}` : ""}` }, ...(input.history ?? []).slice(-10), { role: "user", content: `${context}${sources}\n\nسؤال الطالب:\n${input.question}` }] });
  await waitForMinimumLoayThinking(startedAt);
  const content = result.choices[0]?.message.content;
  const answer = typeof content === "string" ? content.trim() : "";
  if (!answer) throw new Error("لؤي ما قدرش يطلع رد من وضع التفكير دلوقتي.");
  return { answer };
}

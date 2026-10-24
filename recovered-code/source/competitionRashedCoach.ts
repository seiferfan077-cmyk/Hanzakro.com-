import { invokeLLM } from "./_core/llm";

const forbiddenAnswerPattern = /(الإجابة الصحيحة|الجواب النهائي|اختار(?:ي)?|الاختيار [أبجد]|الإجابة هي|الجواب هو)/i;

export function redactRashedCoachReply(reply: string) {
  const trimmed = reply.trim();
  if (!trimmed || forbiddenAnswerPattern.test(trimmed)) return "أنا راشد، مش هقول الحل أو الاختيار في نص المنافسة. أقدر أساعدك تفكّر: حدّد الفكرة الأساسية في السؤال، اكتب معلومة مؤكدة من اللي ذاكرته، وبعدها اختبر هل إجابتك بتجاوب المطلوب فعلاً.";
  return trimmed;
}

export async function askRashedDuringCompetition(input: { memberName: string; prompt: string; questionType: string; userMessage: string }) {
  const result = await invokeLLM({ model: "gpt-5-mini", maxCompletionTokens: 340, messages: [{ role: "system", content: "أنت راشد، الخصم الودود في منافسة مذاكرة لسيف وحنين. تناقش في طريقة فهم السؤال فقط، ولا تعطِ إجابة نهائية أو اختياراً أو تلميحاً يحدد خياراً أو صيغة حل بعينها. لا تقل إنك تعرف مفتاح الإجابة أو نتيجة المستخدم. لا تكتب كلمات: الإجابة الصحيحة، الجواب هو، اختار، الاختيار. اكتب بالمصري في 2 أو 3 جمل: سؤال توجيهي واحد، طريقة تفكير عامة، وتذكير بالسرية." }, { role: "user", content: `المشارك: ${input.memberName}\nنوع السؤال: ${input.questionType}\nنص السؤال فقط (من غير اختيارات أو مفتاح): ${input.prompt}\n\nرسالة المشارك: ${input.userMessage}` }] });
  const content = result.choices[0]?.message.content;
  return { answer: redactRashedCoachReply(typeof content === "string" ? content : "") };
}

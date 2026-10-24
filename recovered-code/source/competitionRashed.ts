import { invokeLLM } from "./_core/llm";

export type RashedBehavior = "analysis" | "intentional_mistake";
export type RashedQuestion = { id: number; questionType: string; prompt: string; options: string[]; evidenceQuote: string };
export type RashedReply = { answerText: string; rationale: string | null; behavior: RashedBehavior };

const replySchema = {
  type: "object",
  properties: {
    answerText: { type: "string", minLength: 1, maxLength: 1800 },
    rationale: { type: "string", minLength: 0, maxLength: 900 },
  },
  required: ["answerText", "rationale"],
  additionalProperties: false,
};

/** نسبة الخطأ حتمية ومتنوعة بين الجولات؛ لا تعتمد على أي بيانات مستخدم أو مفتاح إجابة. */
export function rashedBehaviorForRound(matchId: number, questionId: number): RashedBehavior {
  const seed = Math.abs(((matchId * 1103515245) ^ (questionId * 12345)) >>> 0);
  return seed % 5 === 0 ? "intentional_mistake" : "analysis";
}

function deterministicOption(question: RashedQuestion, behavior: RashedBehavior) {
  if (!question.options.length) return "مش متأكد؛ هحلل الفكرة وأرجع للدليل بعد الحسم.";
  const base = Math.abs((question.id * 31 + question.prompt.length) % question.options.length);
  const offset = behavior === "intentional_mistake" && question.options.length > 1 ? 1 : 0;
  return question.options[(base + offset) % question.options.length];
}

export function normalizeRashedReply(question: RashedQuestion, candidate: { answerText?: unknown; rationale?: unknown }, behavior: RashedBehavior): RashedReply {
  const rawAnswer = typeof candidate.answerText === "string" ? candidate.answerText.trim().slice(0, 1800) : "";
  const exactOption = question.options.find(option => option.trim() === rawAnswer);
  const answerText = question.options.length ? (exactOption ?? deterministicOption(question, behavior)) : (rawAnswer || deterministicOption(question, behavior));
  const rawRationale = typeof candidate.rationale === "string" ? candidate.rationale.trim().slice(0, 900) : "";
  return { answerText, rationale: rawRationale || null, behavior };
}

export async function generateRashedReply(input: { matchId: number; question: RashedQuestion }): Promise<RashedReply> {
  const behavior = rashedBehaviorForRound(input.matchId, input.question.id);
  const options = input.question.options.length ? input.question.options.map((option, index) => `${index + 1}. ${option}`).join("\n") : "لا توجد اختيارات؛ اكتب إجابة قصيرة.";
  const roleInstruction = behavior === "intentional_mistake"
    ? "اختر تفسيراً بديلاً معقولاً قد يثبت لاحقاً أنه غير صحيح، من دون أن تقول إنك تتعمد الخطأ أو تعرف الإجابة المعتمدة. اشرح سبب الاختيار باختصار أو اترك التعليل فارغاً."
    : "حلل السؤال كمنافس ذكي، واختر الإجابة التي تراها صحيحة من معرفتك وتحليلك. اشرح سببك باختصار أو اترك التعليل فارغاً.";
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 900,
      responseFormat: { type: "json_schema", json_schema: { name: "rashed_competition_reply", strict: true, schema: replySchema } },
      messages: [
        { role: "system", content: "أنت راشد، خصم دراسة ذكي في منافسة تعليمية. أجب بنفسك من معرفتك وتحليلك فقط. لا تملك مفتاح الإجابة ولا تطلبه ولا تدّعي رؤية أي تصحيح. لا تكتب نقاطاً أو حكماً نهائياً؛ لؤي هو الحكم بعد الحسم." },
        { role: "user", content: `نوع السؤال: ${input.question.questionType}\nالسؤال: ${input.question.prompt}\nالاختيارات أو شكل الإجابة:\n${options}\n\n${roleInstruction}` },
      ],
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") throw new Error("missing rashed reply");
    return normalizeRashedReply(input.question, JSON.parse(content) as { answerText?: unknown; rationale?: unknown }, behavior);
  } catch {
    return normalizeRashedReply(input.question, {}, behavior);
  }
}

import { invokeLLM } from "./_core/llm";

type LoayReviewInput = {
  prompt: string;
  canonicalAnswer: string;
  evidenceQuote: string;
  explanation: string;
  answers: Array<{ author: string; answer: string; outcome: string; reason: string }>;
  rationales: Array<{ author: string; content: string }>;
};

const reviewSchema = {
  type: "object",
  properties: { reviewText: { type: "string", minLength: 40, maxLength: 2600 } },
  required: ["reviewText"],
  additionalProperties: false,
};

export function fallbackLoayRoundReview(input: LoayReviewInput) {
  const rationaleLines = input.rationales.length ? input.rationales.map(item => `${item.author}: ${item.content}`).join("\n") : "لم يُكتب تعليل لهذه الجولة.";
  return `تصحيح لؤي للجولة:\nالإجابة المعتمدة: ${input.canonicalAnswer}\nلماذا: ${input.explanation}\nدليل المصدر: ${input.evidenceQuote}\nتعليلات الجولة:\n${rationaleLines}\nخطوة الإصلاح: ارجع للدليل، حدّد الفكرة التي سببت اللبس، ثم أجب عن السؤال مرة ثانية بكلماتك.`.slice(0, 2600);
}

export async function generateLoayRoundReview(input: LoayReviewInput) {
  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      maxTokens: 1200,
      responseFormat: { type: "json_schema", json_schema: { name: "loay_round_review", strict: true, schema: reviewSchema } },
      messages: [
        { role: "system", content: "أنت لؤي، حكم ومصحح ومرشد تربوي في منافسة دراسة. بعد الحسم فقط، اكتب مراجعة عربية مصرية مختصرة ودقيقة للجولة. اربط الإجابات والتعليلات بالدليل والإجابة المعتمدة، واشرح سبب الخطأ أو الصحة وخطوة إصلاح عملية. لا تخترع معلومة خارج المدخلات، ولا تعطِ نقاطاً أو تغيّر النتيجة." },
        { role: "user", content: `السؤال: ${input.prompt}\nالإجابة المعتمدة: ${input.canonicalAnswer}\nدليل المصدر: ${input.evidenceQuote}\nتفسير السؤال: ${input.explanation}\nإجابات الأطراف وتقييم لؤي:\n${input.answers.map(item => `${item.author}: ${item.answer}\nالحكم: ${item.outcome}\nسبب الحكم: ${item.reason}`).join("\n\n")}\n\nتعليلاتهم المكتوبة:\n${input.rationales.map(item => `${item.author}: ${item.content}`).join("\n") || "لا توجد تعليلات مكتوبة."}` },
      ],
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") throw new Error("missing loay review");
    const parsed = JSON.parse(content) as { reviewText?: unknown };
    if (typeof parsed.reviewText !== "string" || parsed.reviewText.trim().length < 40) throw new Error("invalid loay review");
    return parsed.reviewText.trim().slice(0, 2600);
  } catch {
    return fallbackLoayRoundReview(input);
  }
}

import { createHash } from "node:crypto";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const ocrSchema = {
  type: "object",
  properties: {
    readable: { type: "boolean" },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    text: { type: "string", maxLength: 30000 },
  },
  required: ["readable", "confidence", "text"],
  additionalProperties: false,
};

function decodeDataUrl(dataBase64: string, mimeType: string) {
  const value = dataBase64.replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(value)) throw new Error("بيانات الصورة غير صالحة.");
  const bytes = Buffer.from(value, "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("الصورة لازم تكون بين 1 بايت و8 ميغابايت.");
  if (!acceptedMimeTypes.has(mimeType)) throw new Error("اختاروا صورة JPG أو PNG أو WEBP فقط.");
  return bytes;
}

export async function ocrCompetitionSourceImage(input: { engineId: number; imageName: string; mimeType: string; dataBase64: string }) {
  const bytes = decodeDataUrl(input.dataBase64, input.mimeType);
  const extension = input.mimeType === "image/jpeg" ? "jpg" : input.mimeType === "image/png" ? "png" : "webp";
  const hash = createHash("sha256").update(bytes).digest("hex");
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    maxTokens: 5000,
    responseFormat: { type: "json_schema", json_schema: { name: "competition_source_ocr", strict: true, schema: ocrSchema } },
    messages: [
      { role: "system", content: "أنت قارئ OCR لمصدر تعليمي. استخرج النص المرئي فقط كما يظهر في الصورة، بما في ذلك الأسئلة والاختيارات والمعادلات المكتوبة نصياً إن كانت واضحة. لا تكمل كلمات غير ظاهرة ولا تضف شرحاً أو إجابة من عندك. إن كانت الصورة غير مقروءة أو فارغة، أرجع readable=false ونصاً فارغاً." },
      { role: "user", content: [{ type: "text", text: `اقرأ هذه الصورة التعليمية بعنوان: ${input.imageName}` }, { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${bytes.toString("base64")}`, detail: "high" } }] },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("تعذر قراءة الصورة بصيغة يمكن التحقق منها.");
  const parsed = JSON.parse(content) as { readable: boolean; confidence: number; text: string };
  const text = parsed.text.replace(/\s+/g, " ").trim().slice(0, 30000);
  if (!parsed.readable || parsed.confidence < 70 || text.length < 20) throw new Error("الصورة ما اتقريتش بثقة كفاية. جرّبوا صورة أوضح أو أضيفوها كنص يدوي.");
  const saved = await storagePut(`competition-sources/${input.engineId}/${hash}.${extension}`, bytes, input.mimeType);
  return { text, confidence: parsed.confidence, storageUrl: saved.url };
}

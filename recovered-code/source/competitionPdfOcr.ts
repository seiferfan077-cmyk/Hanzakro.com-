import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { invokeLLM } from "./_core/llm";

const execFileAsync = promisify(execFile);
const MAX_PAGES_PER_RUN = 40;
const MAX_PDF_BYTES = 30 * 1024 * 1024;
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

function parsePageCount(value: string) {
  const match = value.match(/Pages:\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function parseOcr(content: string) {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("لؤي لم يرجع OCR بصيغة قابلة للمراجعة.");
  const parsed = JSON.parse(normalized.slice(start, end + 1)) as { readable?: boolean; confidence?: number; text?: string };
  const text = typeof parsed.text === "string" ? parsed.text.replace(/\s+/g, " ").trim().slice(0, 30000) : "";
  return { readable: parsed.readable === true, confidence: Number(parsed.confidence ?? 0), text };
}

async function renderPages(bytes: Uint8Array, startPage: number, endPage: number) {
  if (bytes.byteLength > MAX_PDF_BYTES) throw new Error("ملف PDF أكبر من الحد الآمن لـ OCR التلقائي.");
  const folder = await mkdtemp(`${tmpdir()}/saf-haneen-pdf-ocr-`);
  const inputPath = `${folder}/source.pdf`;
  const prefix = `${folder}/page`;
  await writeFile(inputPath, bytes);
  try {
    const info = await execFileAsync("pdfinfo", [inputPath], { maxBuffer: 1024 * 1024 });
    const pageCount = parsePageCount(info.stdout.toString());
    await execFileAsync("pdftoppm", ["-png", "-r", "130", "-scale-to", "1800", "-f", String(startPage), "-l", String(endPage), inputPath, prefix], { maxBuffer: 1024 * 1024 });
    const files = (await readdir(folder)).filter(name => name.startsWith("page-") && name.endsWith(".png")).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    return { pageCount, pages: await Promise.all(files.map(async name => ({ name, bytes: await readFile(`${folder}/${name}`) }))) };
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

export async function ocrCompetitionPdf(input: { bytes: Uint8Array; fileLabel: string; pageStart?: number; pageEnd?: number }) {
  if (!input.bytes.length) throw new Error("ملف PDF فارغ.");
  const requestedStart = input.pageStart ?? 1;
  const requestedRangeEnd = input.pageEnd ?? (requestedStart + MAX_PAGES_PER_RUN - 1);
  const renderedRangeEnd = Math.min(requestedRangeEnd, requestedStart + MAX_PAGES_PER_RUN - 1);
  const firstRender = await renderPages(input.bytes, requestedStart, renderedRangeEnd);
  const detectedPageCount = firstRender.pageCount;
  const requestedEnd = input.pageEnd ?? (detectedPageCount || renderedRangeEnd);
  if (!Number.isInteger(requestedStart) || !Number.isInteger(requestedEnd) || requestedStart < 1 || requestedEnd < requestedStart) throw new Error("نطاق صفحات OCR غير صحيح.");
  const endPage = Math.min(requestedEnd, requestedStart + MAX_PAGES_PER_RUN - 1, detectedPageCount || requestedEnd);
  const truncated = endPage < requestedEnd;
  const rendered = endPage === renderedRangeEnd ? firstRender.pages : (await renderPages(input.bytes, requestedStart, endPage)).pages;
  if (!rendered.length) throw new Error("لم نقدر نحول صفحات PDF المصوّر إلى صور.");
  const pages: Array<{ pageNumber: number; text: string; confidence: number }> = [];
  const warnings: string[] = truncated ? [`تمت قراءة أول ${MAX_PAGES_PER_RUN} صفحة فقط في جلسة OCR؛ حدّد نطاقاً أصغر لباقي الصفحات.`] : [];
  for (let index = 0; index < rendered.length; index += 1) {
    const pageNumber = requestedStart + index;
    const image = rendered[index]!;
    const response = await invokeLLM({
      model: "gemini-3-flash-preview",
      maxTokens: 5000,
      responseFormat: { type: "json_schema", json_schema: { name: "competition_pdf_page_ocr", strict: true, schema: ocrSchema } },
      messages: [
        { role: "system", content: "أنت OCR لصفحة تعليمية مصوّرة. استخرج النص المرئي فقط كما هو، وحافظ على ترتيب العناوين والجداول والمعادلات بتمثيل نصي واضح. لا تخمّن الكلمات المقطوعة ولا تضف شرحاً أو إجابة. إذا الصفحة غير مقروءة أرجع readable=false ونصاً فارغاً." },
        { role: "user", content: [{ type: "text", text: `اقرأ الصفحة ${pageNumber} من المصدر: ${input.fileLabel}` }, { type: "image_url", image_url: { url: `data:image/png;base64,${image.bytes.toString("base64")}`, detail: "high" } }] },
      ],
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") { warnings.push(`الصفحة ${pageNumber}: لم يرجع OCR نتيجة قابلة للقراءة.`); continue; }
    const result = parseOcr(content);
    if (!result.readable || result.confidence < 65 || result.text.length < 20) { warnings.push(`الصفحة ${pageNumber}: النص غير مقروء بثقة كافية وتم استبعادها.`); continue; }
    pages.push({ pageNumber, text: result.text, confidence: result.confidence });
  }
  if (!pages.length) throw new Error(`لم ينجح OCR في قراءة أي صفحة من «${input.fileLabel}». جرّبوا نسخة أوضح أو حدّدوا نطاقاً أصغر.`);
  return { text: pages.map(page => `صفحة ${page.pageNumber}: ${page.text}`).join("\n\n"), pages, warnings, pageCount: detectedPageCount || endPage };
}

export function isScannedPdfWithoutText(input: { text: string; pages: Array<{ text: string }> }) {
  return !input.text.trim() && input.pages.length === 0;
}

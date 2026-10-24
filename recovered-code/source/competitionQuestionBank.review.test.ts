import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { jsPDF } from "jspdf";
import { extractPdfIndex, parsePdfPageIndex, selectPdfPageRange } from "./pdfIndex";
import { buildCompetitionSourceQuestionPlan, generateCompetitionQuestionBank } from "./competitionQuestionGenerator";
import { validateGeneratedQuestion } from "./competitionQuestionTypes";
import { getCompetitionQuestionProgress } from "./competitionQuestionProgress";
const generatorSource = readFileSync(new URL("./competitionQuestionGenerator.ts", import.meta.url), "utf8");

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./competitionQuestionDb", () => ({
  getCompetitionEngineForQuestions: vi.fn(),
  saveValidatedCompetitionQuestions: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { getCompetitionEngineForQuestions, saveValidatedCompetitionQuestions } from "./competitionQuestionDb";

const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function pdfWithText(lines: string[]) {
  const document = new jsPDF();
  lines.forEach((line, index) => document.text(line, 12, 16 + index * 8));
  return new Uint8Array(document.output("arraybuffer"));
}

function pdfWithImageOnly() {
  const document = new jsPDF();
  document.addImage(`data:image/png;base64,${tinyPng}`, "PNG", 12, 16, 12, 12);
  return new Uint8Array(document.output("arraybuffer"));
}

describe("مراجعة عملية لاستخراج مصادر بنك الأسئلة", () => {
  it("يقرأ PDF نصياً ويحتفظ بالصفحات والدليل القابل للاقتباس", async () => {
    const result = await extractPdfIndex(pdfWithText(["Physics — straight line motion", "Average velocity equals distance divided by time."]));
    expect(result.text).toContain("straight line motion");
    expect(result.text).toContain("Average velocity");
    expect(result.pages[0]?.text).toContain("Average velocity");
    expect(result.pages).toHaveLength(1);
  });

  it("يكشف جدولاً مختلطاً كنص ولا يدّعي أنه صورة أو معرفة خارجية", async () => {
    const result = await extractPdfIndex(pdfWithText(["Experiment results table", "time | distance | speed", "2 s | 10 m | 5 m/s"]));
    expect(result.text).toContain("time");
    expect(result.text).toContain("10 m");
    expect(result.text).toContain("5 m/s");
  });

  it("يقرأ النص الطويل مع حد الفهرسة المعروف ولا يسقط الصفحة بالكامل", async () => {
    const result = await extractPdfIndex(pdfWithText(["درس الطاقة", "الطاقة الحركية = نصف الكتلة × مربع السرعة", "ملاحظة تطبيقية متكررة ".repeat(30)]));
    expect(result.text.length).toBeGreaterThan(80);
    expect(result.text.length).toBeLessThanOrEqual(60000);
    expect(result.pages.length).toBeGreaterThan(0);
  });

  it("يفرق بوضوح بين PDF مصور بلا طبقة نص وبين فهرس صفحات نصي", async () => {
    const result = await extractPdfIndex(pdfWithImageOnly());
    expect(result.text).toBe("");
    expect(result.pages).toEqual([]);
    const indexed = parsePdfPageIndex(JSON.stringify([{ pageNumber: 1, text: "نص مفهرس من صفحة كتاب" }]));
    expect(selectPdfPageRange(indexed, 1, 1)).toContain("نص مفهرس");
  });

  it("يوزع عدة مصادر ولا يجعل المصدر المساعد يلغي المصدر الأساسي", () => {
    const plan = buildCompetitionSourceQuestionPlan([{ id: 1, isPrimary: true }, { id: 2, isPrimary: false }, { id: 3, isPrimary: false }], 10);
    expect(plan.reduce((sum, item) => sum + item.count, 0)).toBe(10);
    expect(plan.find(item => item.sourceId === 1)?.count).toBeGreaterThan(plan.find(item => item.sourceId === 2)?.count ?? 0);
  });

  it("يرفض سؤالاً بلا دليل أو بجودة معلنة منخفضة ويقبل سؤالاً موثقاً", () => {
    const source = "تعريف السرعة هو المسافة المقطوعة مقسومة على الزمن.";
    const base = { questionType: "true_false" as const, prompt: "هل السرعة تعتمد على المسافة والزمن؟", options: ["صح", "خطأ"], answer: "صح", explanation: "النص يذكر القسمة على الزمن.", evidenceQuote: "تعريف السرعة هو المسافة المقطوعة مقسومة على الزمن.", difficulty: 2, quality: { questionClear: true, oneVerifiableAnswer: true, referenceIsSufficient: true } };
    expect(validateGeneratedQuestion(base, 1, source)).not.toBeNull();
    expect(validateGeneratedQuestion({ ...base, evidenceQuote: "معلومة غير موجودة" }, 1, source)).toBeNull();
    expect(validateGeneratedQuestion({ ...base, quality: { ...base.quality, questionClear: false } }, 1, source)).toBeNull();
  });

  it("يستبعد الدليل الذي يمثل حقوق نشر أو رابطاً أو OCR مشوشاً حتى لو ظهر داخل النص", () => {
    const source = "حقوق النشر محفوظة https://example.com\nالمفهوم: السرعة هي المسافة مقسومة على الزمن.";
    const base = { questionType: "short_answer" as const, prompt: "ما العلاقة التي يذكرها المصدر بين السرعة والمسافة؟", options: [], answer: "السرعة هي المسافة مقسومة على الزمن", explanation: "هذه العلاقة وردت في السطر التعليمي.", evidenceQuote: "حقوق النشر محفوظة https://example.com", difficulty: 2, quality: { questionClear: true, oneVerifiableAnswer: true, referenceIsSufficient: true } };
    expect(validateGeneratedQuestion(base, 1, source)).toBeNull();
  });

  it("يستخدم قراءة موزعة للمصدر الطويل وسياقاً للمصادر المساعدة بدلاً من أول 12000 حرف فقط", () => {
    expect(generatorSource).toContain("maximumSourceCharactersForGeneration = 48000");
    expect(generatorSource).toContain("مقطع مركزي من المصدر");
    expect(generatorSource).toContain("buildCrossSourceContext");
    expect(generatorSource).toContain("المصادر المساعدة للفهم وربط الأفكار فقط");
  });
});

describe("مراجعة المحاولات الأربع والتقدم الحقيقي", () => {
  it("يعيد المحاولة أربع مرات ثم يعتمد أول سؤال موثق دون حلقة لا نهائية", async () => {
    const llm = vi.mocked(invokeLLM);
    const getEngine = vi.mocked(getCompetitionEngineForQuestions);
    const save = vi.mocked(saveValidatedCompetitionQuestions);
    const sourceText = "درس السرعة في الحركة المستقيمة: تعريف السرعة هو المسافة المقطوعة مقسومة على الزمن. نستخدم هذا القانون لفهم العلاقة بين المسافة والزمن في مسائل الفيزياء.";
    getEngine.mockResolvedValue({ engine: { id: 77, status: "draft", questionCount: 1, difficulty: 2, title: "فيزياء الحركة", subjectName: "فيزياء", gradeLevel: "أولى ثانوي", unitName: "الحركة", lessonTitle: "السرعة" } as never, sources: [{ id: 9, label: "كتاب الحركة", contentSnapshot: sourceText, isPrimary: true } as never] });
    save.mockImplementation(async ({ questions }) => ({ questions: questions as never, requestedCount: 1, acceptedCount: questions.length, partial: false }));
    const invalid = { questions: [{ questionType: "true_false", prompt: "سؤال غير موثق واضح؟", options: ["صح", "خطأ"], answer: "صح", explanation: "غير موثق", evidenceQuote: "لا يوجد هذا الدليل", difficulty: 2, quality: { questionClear: false, oneVerifiableAnswer: true, referenceIsSufficient: false } }] };
    const valid = { questions: [{ questionType: "true_false", prompt: "هل السرعة تعتمد على الزمن؟", options: ["صح", "خطأ"], answer: "صح", explanation: "المصدر يربط السرعة بالمسافة والزمن.", evidenceQuote: sourceText, difficulty: 2, quality: { questionClear: true, oneVerifiableAnswer: true, referenceIsSufficient: true } }] };
    llm.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(invalid) } }] } as never).mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(invalid) } }] } as never).mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(invalid) } }] } as never).mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify(valid) } }] } as never);
    const result = await generateCompetitionQuestionBank({ engineId: 77, member: "saif" });
    expect(llm).toHaveBeenCalledTimes(4);
    expect(result.acceptedCount).toBe(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(getCompetitionQuestionProgress(77)).toMatchObject({ status: "completed", stage: "completed", acceptedQuestions: 1, currentAttempt: 4 });
  });

  it("يبني بنكاً احتياطياً موثقاً من الجمل الأصلية إذا رفض النموذج كل مخرجاته", async () => {
    const llm = vi.mocked(invokeLLM);
    const getEngine = vi.mocked(getCompetitionEngineForQuestions);
    const save = vi.mocked(saveValidatedCompetitionQuestions);
    const sourceText = "الخلية هي الوحدة الأساسية في بناء الكائنات الحية. تحتوي الخلية على غشاء ينظم مرور المواد. تنقسم بعض الخلايا لإنتاج خلايا جديدة.";
    getEngine.mockResolvedValue({ engine: { id: 88, status: "draft", questionCount: 3, difficulty: 2, title: "أحياء", subjectName: "أحياء" } as never, sources: [{ id: 10, label: "درس الخلية", contentSnapshot: sourceText, isPrimary: true } as never] });
    save.mockImplementation(async ({ questions }) => ({ questions: questions as never, requestedCount: 3, acceptedCount: questions.length, partial: false }));
    llm.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ questions: [{ questionType: "short_answer", prompt: "سؤال غير موثق", options: [], answer: "غير معروف", explanation: "لا دليل", evidenceQuote: "غير موجود", difficulty: 2, quality: { questionClear: false, oneVerifiableAnswer: false, referenceIsSufficient: false } }] }) } }] } as never);
    const result = await generateCompetitionQuestionBank({ engineId: 88, member: "saif" });
    expect(result.acceptedCount).toBe(3);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ questions: expect.arrayContaining([expect.objectContaining({ questionType: "true_false", answer: "صح" })]) }));
  });
});

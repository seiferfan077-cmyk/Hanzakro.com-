import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  listLLMModels: vi.fn(),
  needsWebResearch: vi.fn(),
  researchWeb: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM, listLLMModels: mocks.listLLMModels }));
vi.mock("./storage", () => ({ storageGetSignedUrl: vi.fn() }));
vi.mock("./studyAssistant", () => ({ educationalSystemPrompt: "تعليمات تعليمية" }));
vi.mock("./webResearch", () => ({ LOAY_EXAM_RESEARCH_MINIMUM_SOURCES: 30, needsWebResearch: mocks.needsWebResearch, researchWeb: mocks.researchWeb }));

import { gradeLoayExam, prepareLoayExam } from "./loayExam";

const quality = { sourceGrounded: true, clear: true, oneBestAnswer: true };
const response = (questions: unknown[]) => ({ choices: [{ message: { content: JSON.stringify({ questions }) } }] });

describe("Loay exam quality gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-mini" }, { id: "gemini-3-flash-preview" }] });
    mocks.needsWebResearch.mockReturnValue(false);
    mocks.researchWeb.mockResolvedValue({ sources: [] });
  });

  it("يرفض السؤال المكرر أو الاختيار المضلل ثم يعيد طلب البدائل السليمة فقط", async () => {
    mocks.invokeLLM
      .mockResolvedValueOnce(response([
        { id: "q1", type: "choice", prompt: "حدد المفعول به في الجملة: كتب الطالب الدرس.", options: ["الطالب", "كتب", "الدرس", "في"], correctAnswer: "الدرس", rubric: "يحدد الاسم الذي وقع عليه الفعل.", explanation: "الدرس هو الذي وقع عليه فعل الكتابة.", sourceEvidence: "المفعول به", quality },
        { id: "q2", type: "choice", prompt: "حدد المفعول به في الجملة: كتب الطالب الدرس.", options: ["الطالب", "كتب", "الدرس", "في"], correctAnswer: "الدرس", rubric: "يحدد المفعول به.", explanation: "الدرس مفعول به.", sourceEvidence: "المفعول به", quality },
        { id: "q3", type: "choice", prompt: "اختار الإجابة الصحيحة.", options: ["كل ما سبق", "الطالب", "الدرس", "الفعل"], correctAnswer: "كل ما سبق", rubric: "اختيار صحيح.", explanation: "غير مناسب.", sourceEvidence: "المفعول به", quality },
      ]))
      .mockResolvedValueOnce(response([
        { id: "q4", type: "true_false", prompt: "صح ولا غلط: المفعول به اسم وقع عليه الفعل.", options: ["صح", "غلط"], correctAnswer: "صح", rubric: "يتحقق من تعريف المفعول به.", explanation: "التعريف يصف المفعول به.", sourceEvidence: "المفعول به", quality },
        { id: "q5", type: "short", prompt: "اكتب مثالاً بسيطاً فيه فعل وفاعل ومفعول به.", options: [], correctAnswer: "قرأ الطالب الدرس", rubric: "يحتوي المثال على فعل وفاعل ومفعول به.", explanation: "يمكن تحديد عناصر الجملة في المثال.", sourceEvidence: "المفعول به", quality },
      ]));

    const exam = await prepareLoayExam({ topic: "شرح المفعول به", questionCount: 3, images: [] });

    expect(exam.questions).toHaveLength(3);
    expect(exam.questions.map(question => question.type)).toEqual(["choice", "true_false", "short"]);
    expect(exam.questions.every(question => question.quality?.oneBestAnswer && question.sourceEvidence)).toBe(true);
    expect(mocks.invokeLLM).toHaveBeenCalledTimes(2);
  });

  it("يرفض إظهار اختبار ناقص الجودة إذا لم يأتِ بديل سليم بعد الإعادة", async () => {
    mocks.invokeLLM.mockResolvedValue(response([
      { id: "q1", type: "choice", prompt: "اختار غير الصحيح", options: ["أ", "ب", "ج", "د"], correctAnswer: "أ", rubric: "اختيار.", explanation: "شرح.", sourceEvidence: "المفعول به", quality },
    ]));

    await expect(prepareLoayExam({ topic: "شرح المفعول به", questionCount: 2, images: [] })).rejects.toThrow("استبعد أسئلة ما حققتش جودة كفاية");
  });

  it("يفرض 30 مصدراً لبنك الامتحان ويدعم التفكير الإجباري قبل بنائه", () => {
    const source = readFileSync("server/loayExam.ts", "utf8");
    expect(source).toContain("LOAY_EXAM_RESEARCH_MINIMUM_SOURCES");
    expect(source).toContain('minimumSources: LOAY_EXAM_RESEARCH_MINIMUM_SOURCES');
    expect(source).toContain("forceThinking?: boolean");
    expect(source).toContain("waitForMinimumLoayThinking(thinkingStartedAt)");
  });

  it("يربط صورة السؤال فقط برقم من صور المصدر المعتمدة ولا يقبل رابطاً من النموذج", async () => {
    mocks.invokeLLM
      .mockResolvedValueOnce({ choices: [{ message: { content: "شرح المصدر الظاهر في الصور: المفعول به اسم وقع عليه الفعل." } }] })
      .mockResolvedValueOnce(response([
        { id: "pictured", type: "choice", prompt: "في الصورة، ما الكلمة التي وقع عليها الفعل في جملة كتب الطالب الدرس؟", options: ["الطالب", "كتب", "الدرس", "في"], correctAnswer: "الدرس", rubric: "يحدد المفعول به من الجملة الظاهرة.", explanation: "الدرس وقع عليه فعل الكتابة.", sourceEvidence: "المفعول به", imageIndex: 0, quality },
        { id: "plain", type: "true_false", prompt: "صح ولا غلط: المفعول به اسم وقع عليه الفعل.", options: ["صح", "غلط"], correctAnswer: "صح", rubric: "يتحقق من تعريف المفعول به.", explanation: "التعريف يصف المفعول به.", sourceEvidence: "المفعول به", imageIndex: null, quality },
      ]));

    const exam = await prepareLoayExam({ topic: "المفعول به", questionCount: 2, images: [{ storageKey: "private-chat-media/saif/page.png", originalName: "page.png" }] });

    expect(exam.questions[0].image).toEqual({ storageKey: "private-chat-media/saif/page.png", alt: "صورة من مصدر السؤال: page.png" });
    expect(exam.questions[1].image).toBeUndefined();
    expect(mocks.invokeLLM.mock.calls[1][0].messages[1].content).toContain("0: page.png");
  });
});

describe("Loay exam grading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listLLMModels.mockResolvedValue({ data: [{ id: "gpt-5-mini" }] });
  });

  it("يصحح الاختيار والصح والغلط بشكل حتمي من غير نموذج لغوي", async () => {
    const result = await gradeLoayExam({
      questions: [
        { id: "c", type: "choice", prompt: "اختر علامة رفع المبتدأ.", options: ["الضمة", "الفتحة", "الكسرة", "السكون"], correctAnswer: "الضمة", rubric: "يحدد علامة الرفع.", explanation: "المبتدأ مرفوع." },
        { id: "t", type: "true_false", prompt: "صح ولا غلط: الفاعل مرفوع.", options: ["صح", "غلط"], correctAnswer: "صح", rubric: "يعرف حكم الفاعل.", explanation: "الفاعل مرفوع." },
      ],
      answers: [{ id: "c", answer: "الضمة" }, { id: "t", answer: "غلط" }],
    });

    expect(result.score).toBe(1);
    expect(result.breakdown).toEqual({ correct: 1, partial: 0, needsReview: 0, unanswered: 0 });
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("يحوّل الغموض في الإجابة الحرة إلى مراجعة واضحة بدلاً من حكم واثق زائف", async () => {
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ evaluations: [{ id: "s", score: 0.5, confidence: "low", needsReview: false, feedback: "الإجابة لمست الفكرة، لكن الصياغة محتاجة توضيح." }] }) } }] });

    const result = await gradeLoayExam({
      questions: [{ id: "s", type: "short", prompt: "فسر أهمية القراءة.", options: [], correctAnswer: "توسع المعرفة وتنمي الفهم", rubric: "يذكر أثر القراءة في المعرفة أو الفهم.", explanation: "القراءة توسع المعرفة." }],
      answers: [{ id: "s", answer: "عشان بتفيد" }],
    });

    expect(result.evaluations[0]).toMatchObject({ score: 0.5, confidence: "low", needsReview: true });
    expect(result.breakdown.needsReview).toBe(1);
    expect(mocks.invokeLLM).toHaveBeenCalledOnce();
  });
});

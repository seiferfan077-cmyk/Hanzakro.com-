// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({ trpc: { assistant: { saveExamProgress: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn().mockResolvedValue({ id: "attempt-12345678" }) }) }, gradeExam: { useMutation: (options?: { onSuccess?: (result: unknown) => void }) => ({ isPending: false, mutate: () => options?.onSuccess?.({ evaluations: [{ id: "q1", score: 1, confidence: "high", needsReview: false, feedback: "اختيارك مضبوط؛ ركّز على سبب الإجابة." }, { id: "q2", score: 1, confidence: "high", needsReview: false, feedback: "إجابتك صحيحة والفكرة ثبتت." }], score: 2, total: 2, percentage: 100, breakdown: { correct: 2, partial: 0, needsReview: 0, unanswered: 0 } }) }) } } } }));

import LoayExamRoom, { QuestionSourceImage, SlowFeedback } from "./LoayExamRoom";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("تفاعل صورة سؤال لؤي وتعليق التصحيح", () => {
  it("يعرض صورة المصدر من تخزين المنصة ويطلب فتحها بالحجم الكامل عند لمسها", () => {
    const onOpen = vi.fn();
    render(<QuestionSourceImage image={{ storageKey: "private-chat-media/saif/lesson image.png", alt: "صورة صفحة الدرس" }} onOpen={onOpen} />);

    expect(screen.getByRole("img", { name: "صورة صفحة الدرس" }).getAttribute("src")).toBe("/manus-storage/private-chat-media/saif/lesson%20image.png");
    fireEvent.click(screen.getByRole("button", { name: "فتح صورة صفحة الدرس بالحجم الكامل" }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("يظهر تعليق لؤي تدريجياً ويمكن كشفه كاملاً فوراً", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockReturnValue({ matches: false }) });
    const { rerender } = render(<SlowFeedback text="راجع الفكرة الأساسية" startDelayMs={0} revealNow={false} />);

    act(() => { vi.advanceTimersByTime(66); });
    expect(screen.getByText(/راج/)).toBeTruthy();
    rerender(<SlowFeedback text="راجع الفكرة الأساسية" startDelayMs={0} revealNow />);
    expect(screen.getByText("راجع الفكرة الأساسية")).toBeTruthy();
  });

  it("يكشف التعليق كاملاً مباشرة عندما يفضّل المستخدم تقليل الحركة", () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockReturnValue({ matches: true }) });
    render(<SlowFeedback text="التعليق كامل ومتاح فوراً" startDelayMs={900} revealNow={false} />);
    expect(screen.getByText("التعليق كامل ومتاح فوراً")).toBeTruthy();
  });

  it("يفتح صورة السؤال من داخل غرفة الامتحان في نافذة قراءة كاملة", () => {
    render(<LoayExamRoom memberSlot="saif" title="اختبار مصوّر" onClose={vi.fn()} questions={[
      { id: "q1", type: "choice", prompt: "حدّد المفعول به في الصورة.", options: ["كتب", "الطالب", "الدرس", "في"], correctAnswer: "الدرس", rubric: "يحدد المفعول به.", explanation: "الدرس وقع عليه الفعل.", image: { storageKey: "private-chat-media/saif/lesson.png", alt: "صورة جملة الدرس" } },
      { id: "q2", type: "true_false", prompt: "صح ولا غلط: الفاعل مرفوع.", options: ["صح", "غلط"], correctAnswer: "صح", rubric: "يتحقق من تعريف الفاعل.", explanation: "الفاعل مرفوع." },
    ]} />);

    fireEvent.click(screen.getByRole("button", { name: "فتح صورة جملة الدرس بالحجم الكامل" }));
    expect(screen.getByText("صورة السؤال")).toBeTruthy();
    const fullImage = screen.getAllByRole("img", { name: "صورة جملة الدرس" }).at(-1);
    expect(fullImage?.getAttribute("src")).toBe("/manus-storage/private-chat-media/saif/lesson.png");
  });

  it("يسلّم اختباراً مصوّراً ثم يعرض تعليق لؤي التعليمي بعد النتيجة", async () => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn().mockReturnValue({ matches: true }) });
    render(<LoayExamRoom memberSlot="saif" title="اختبار مصوّر" onClose={vi.fn()} questions={[
      { id: "q1", type: "choice", prompt: "حدّد المفعول به في الصورة.", options: ["كتب", "الطالب", "الدرس", "في"], correctAnswer: "الدرس", rubric: "يحدد المفعول به.", explanation: "الدرس وقع عليه الفعل.", image: { storageKey: "private-chat-media/saif/lesson.png", alt: "صورة جملة الدرس" } },
      { id: "q2", type: "true_false", prompt: "صح ولا غلط: الفاعل مرفوع.", options: ["صح", "غلط"], correctAnswer: "صح", rubric: "يتحقق من تعريف الفاعل.", explanation: "الفاعل مرفوع." },
    ]} />);

    fireEvent.click(screen.getByRole("button", { name: "الدرس" }));
    fireEvent.click(screen.getByRole("button", { name: /التالي/ }));
    fireEvent.click(screen.getByRole("button", { name: "صح" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /سلّم للؤي/ })); await Promise.resolve(); });

    expect(await screen.findByText("نتيجة لؤي")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "إظهار كل تعليقات لؤي فوراً" }));
    expect(screen.getByText("اختيارك مضبوط؛ ركّز على سبب الإجابة.")).toBeTruthy();
  });
});

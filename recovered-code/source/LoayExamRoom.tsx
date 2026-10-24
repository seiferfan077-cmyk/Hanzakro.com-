import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CirclePause, CirclePlay, ClipboardCheck, ChevronLeft, ChevronRight, X } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type LoayExamQuestion = {
  id: string;
  type: "choice" | "true_false" | "short";
  prompt: string;
  options: string[];
  correctAnswer: string;
  rubric: string;
  explanation: string;
  sourceEvidence?: string;
  quality?: { sourceGrounded: boolean; clear: boolean; oneBestAnswer: boolean };
  image?: { storageKey: string; alt: string };
};

export type LoayExamResult = {
  evaluations: Array<{ id: string; score: number; confidence: "high" | "medium" | "low"; needsReview: boolean; feedback: string }>;
  score: number;
  total: number;
  percentage: number;
  breakdown: { correct: number; partial: number; needsReview: number; unanswered: number };
};

export type LoayExamProgress = { activeIndex: number; answers: Record<string, string>; paused: boolean };

function questionTypeLabel(type: LoayExamQuestion["type"]) {
  return type === "choice" ? "اختار الإجابة" : type === "true_false" ? "صح ولا غلط" : "اكتب إجابتك";
}

function resultTitle(percentage: number) {
  if (percentage >= 85) return "برافو عليك، مستوى ثابت";
  if (percentage >= 65) return "نتيجة حلوة، وكام نقطة هنثبتهم";
  return "دي بداية كويسة للمراجعة، تعال نرتّب الغلط";
}

export function storageImageUrl(storageKey: string) {
  return `/manus-storage/${storageKey.split("/").map(segment => encodeURIComponent(segment)).join("/")}`;
}

export function QuestionSourceImage({ image, compact = false, onOpen }: { image: NonNullable<LoayExamQuestion["image"]>; compact?: boolean; onOpen: () => void }) {
  return <figure className={`loay-exam-source-image ${compact ? "is-compact" : ""}`}>
    <button type="button" onClick={onOpen} className="loay-exam-source-image-button" aria-label={`فتح ${image.alt} بالحجم الكامل`}>
      <img src={storageImageUrl(image.storageKey)} alt={image.alt} />
    </button>
    <figcaption><span>{compact ? "راجع صورة المصدر" : "الصورة جزء من السؤال"}</span><button type="button" onClick={onOpen}>فتح بالحجم الكامل</button></figcaption>
  </figure>;
}

export function SlowFeedback({ text, startDelayMs, revealNow }: { text: string; startDelayMs: number; revealNow: boolean }) {
  const [shownText, setShownText] = useState(revealNow ? text : "");

  useEffect(() => {
    if (revealNow || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShownText(text); return; }
    setShownText("");
    let cursor = 0;
    let typingTimer: number | undefined;
    const startTimer = window.setTimeout(() => {
      typingTimer = window.setInterval(() => {
        cursor += 1;
        setShownText(text.slice(0, cursor));
        if (cursor >= text.length && typingTimer !== undefined) window.clearInterval(typingTimer);
      }, 22);
    }, startDelayMs);
    return () => { window.clearTimeout(startTimer); if (typingTimer !== undefined) window.clearInterval(typingTimer); };
  }, [revealNow, startDelayMs, text]);

  return <p aria-label={text}>{shownText}{shownText.length < text.length ? <span className="loay-feedback-caret" aria-hidden="true">|</span> : null}</p>;
}

export default function LoayExamRoom({ memberSlot, title, questions, attemptId, initialProgress, onClose }: { memberSlot: "saif" | "haneen"; title: string; questions: LoayExamQuestion[]; attemptId?: string; initialProgress?: LoayExamProgress; onClose: () => void }) {
  const progressKey = useMemo(() => `saf-haneen-loay-exam:${memberSlot}:${questions.map(question => question.id).join("|")}`, [memberSlot, questions]);
  const [restoredProgress] = useState<LoayExamProgress | null>(() => {
    try {
      const saved = initialProgress ?? JSON.parse(window.localStorage.getItem(progressKey) || "null") as LoayExamProgress | null;
      if (saved && Number.isInteger(saved.activeIndex) && saved.activeIndex >= 0 && saved.activeIndex < questions.length && saved.answers && typeof saved.answers === "object") return { activeIndex: saved.activeIndex, answers: saved.answers, paused: Boolean(saved.paused) };
    } catch { window.localStorage.removeItem(progressKey); }
    return null;
  });
  const [activeIndex, setActiveIndex] = useState(() => restoredProgress?.activeIndex ?? 0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => restoredProgress?.answers ?? {});
  const [paused, setPaused] = useState(() => restoredProgress?.paused ?? false);
  const [result, setResult] = useState<LoayExamResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openedImage, setOpenedImage] = useState<NonNullable<LoayExamQuestion["image"]> | null>(null);
  const [revealAllFeedback, setRevealAllFeedback] = useState(false);
  const attemptIdRef = useRef(attemptId);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveProgress = trpc.assistant.saveExamProgress.useMutation({ onSuccess: value => { attemptIdRef.current = value.id; }, onError: error => toast.error(error.message || "حفظ امتحان لؤي ما اكتملش. جرّب توقفه تاني بعد لحظة.") });
  const grade = trpc.assistant.gradeExam.useMutation({
    onSuccess: value => { setRevealAllFeedback(false); setResult(value); setIsSubmitting(false); window.localStorage.removeItem(progressKey); },
    onError: error => { setIsSubmitting(false); toast.error(error.message || "لؤي ما قدرش يصحح الاختبار دلوقتي."); },
  });

  const persistProgress = useCallback((status: "active" | "paused") => {
    const saveSnapshot = async () => {
      const saved = await saveProgress.mutateAsync({ memberSlot, attemptId: attemptIdRef.current, title, questions, answers, activeIndex, status });
      attemptIdRef.current = saved.id;
      return saved.id;
    };
    const nextSave = saveQueueRef.current.then(saveSnapshot, saveSnapshot);
    saveQueueRef.current = nextSave.then(() => undefined, () => undefined);
    return nextSave;
  }, [activeIndex, answers, memberSlot, questions, saveProgress, title]);

  useEffect(() => {
    if (result || isSubmitting) return;
    window.localStorage.setItem(progressKey, JSON.stringify({ activeIndex, answers, paused } satisfies LoayExamProgress));
    const timer = window.setTimeout(() => { void persistProgress(paused ? "paused" : "active").catch(() => undefined); }, 450);
    return () => window.clearTimeout(timer);
  }, [activeIndex, answers, isSubmitting, paused, persistProgress, progressKey, result]);

  const question = questions[activeIndex];
  const answeredCount = questions.filter(item => answers[item.id]?.trim()).length;
  const finish = async () => {
    if (answeredCount < questions.length) { toast.info(`فاضل ${questions.length - answeredCount} سؤال. جاوبهم أو راجعهم قبل التسليم.`); return; }
    setIsSubmitting(true);
    try {
      const savedAttemptId = await persistProgress("active");
      grade.mutate({ memberSlot, attemptId: savedAttemptId || attemptIdRef.current, questions, answers: questions.map(item => ({ id: item.id, answer: answers[item.id] || "" })) });
    } catch {
      setIsSubmitting(false);
      toast.error("لؤي ما قدرش يحفظ آخر إجاباتك قبل التصحيح. جرّب تسلّم تاني بعد لحظة.");
    }
  };

  const pauseAndSave = () => { setPaused(true); void persistProgress("paused").catch(() => undefined); };
  const closeAndSave = () => { if (!result && !isSubmitting) void persistProgress(paused ? "paused" : "active").catch(() => undefined); onClose(); };

  return <div className="loay-exam-room" role="dialog" aria-modal="true" aria-label="امتحان لؤي">
    <div className="loay-exam-sheen" aria-hidden="true" />
    <header className="loay-exam-header"><div className="flex min-w-0 items-center gap-3"><img className="loay-exam-portrait" src="/manus-storage/loay-exam-tutor_4bc308a4.png" alt="لؤي مدرس المراجعة" /><div className="min-w-0"><p className="loay-exam-kicker">امتحان لؤي · مراجعة خاصة</p><h2 className="truncate">{title}</h2><p>{result ? "لؤي راجع الإجابات" : paused ? "الاختبار متوقف ومحفوظ" : saveProgress.isPending ? "لؤي بيحفظ تقدمك…" : `السؤال ${Math.min(activeIndex + 1, questions.length)} من ${questions.length}`}</p></div></div><button onClick={closeAndSave} className="loay-exam-close" aria-label="إغلاق امتحان لؤي"><X size={19} /></button></header>
    {result ? <section className="loay-exam-result">
      <div className="loay-exam-score"><span>{result.percentage}٪</span><small>{result.score} من {result.total}</small></div>
      <div><p className="loay-exam-kicker">نتيجة لؤي</p><h3>{resultTitle(result.percentage)}</h3><p>لؤي حسب المعدل من إجاباتك الفعلية، وشرح تحت كل سؤال النقطة اللي اتثبتت أو محتاجة مراجعة.</p></div>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f4f7f1] p-3 text-sm font-bold text-[#2f5748]"><span className="flex items-center gap-1"><CheckCircle2 size={15} /> صح: {result.breakdown.correct}</span><span>قريبة: {result.breakdown.partial}</span><span>تحتاج مراجعة: {result.breakdown.needsReview}</span><span>من غير إجابة: {result.breakdown.unanswered}</span></div>
      <button type="button" onClick={() => setRevealAllFeedback(true)} className="loay-exam-reveal-all">إظهار كل تعليقات لؤي فوراً</button>
      <div className="loay-exam-feedback-list">{questions.map((item, index) => {
        const evaluation = result.evaluations.find(value => value.id === item.id);
        const label = evaluation?.needsReview ? "مراجعة" : evaluation?.score === 1 ? "صح" : evaluation?.score === 0.5 ? "قريبة" : "راجعها";
        return <article key={item.id}><span className={evaluation?.score === 1 && !evaluation.needsReview ? "is-good" : evaluation?.score === 0.5 ? "is-partial" : "is-review"}>{label}</span><div><strong>{index + 1}. {item.prompt}</strong>{item.image ? <QuestionSourceImage image={item.image} compact onOpen={() => setOpenedImage(item.image!)} /> : null}<SlowFeedback text={evaluation?.feedback || item.explanation} startDelayMs={index * 360} revealNow={revealAllFeedback} />{evaluation?.needsReview ? <small className="mt-1 block font-bold text-[#a95b2a]">لؤي محتاج منك تراجع الفكرة أو توضّحها أكتر قبل ما تعتمد النتيجة.</small> : null}</div></article>;
      })}</div>
      <Button onClick={onClose} className="mt-2 w-full rounded-2xl bg-[#315f4d] py-6 font-black">رجوع للدردشة</Button>
    </section> : paused ? <section className="loay-exam-paused"><CirclePause size={42} /><h3>خد راحتك، الامتحان اتحفظ</h3><p>لؤي مستنيك. تقدر تذاكر وترجع تكمل من نفس السؤال حتى لو قفلت الصفحة.</p><Button onClick={() => setPaused(false)} className="rounded-2xl bg-[#315f4d] px-6 py-5 font-black"><CirclePlay size={18} />كمّل الاختبار</Button><button type="button" onClick={closeAndSave}>ارجع للدردشة من غير ما تلغي الإجابات</button></section> : <main className="loay-exam-body">
      <div className="loay-exam-progress"><span style={{ width: `${((activeIndex + 1) / questions.length) * 100}%` }} /></div>
      <div className="loay-exam-question-head"><span>{questionTypeLabel(question.type)}</span><p>{answeredCount} إجابة متسجلة</p></div>
      <h3>{question.prompt}</h3>
      {question.image ? <QuestionSourceImage image={question.image} onOpen={() => setOpenedImage(question.image!)} /> : null}
      {question.type === "short" ? <textarea value={answers[question.id] || ""} onChange={event => setAnswers(current => ({ ...current, [question.id]: event.target.value }))} rows={6} placeholder="اكتب إجابتك بطريقتك… لؤي هيصحح المعنى مش التطابق الحرفي." className="loay-exam-answer-field" /> : <div className="loay-exam-options">{question.options.map(option => <button key={option} type="button" onClick={() => setAnswers(current => ({ ...current, [question.id]: option }))} className={answers[question.id] === option ? "is-selected" : ""}><i aria-hidden="true" />{option}</button>)}</div>}
      <div className="loay-exam-actions"><Button type="button" variant="outline" disabled={activeIndex === 0 || isSubmitting} onClick={() => setActiveIndex(value => Math.max(0, value - 1))}><ChevronRight size={18} />السابق</Button><Button type="button" variant="outline" disabled={isSubmitting} onClick={pauseAndSave}><CirclePause size={18} />وقف وذاكر</Button>{activeIndex === questions.length - 1 ? <Button type="button" disabled={grade.isPending || isSubmitting} onClick={finish} className="bg-[#315f4d] font-black">{grade.isPending || isSubmitting ? "لؤي بيأمّن التسليم…" : <><ClipboardCheck size={18} />سلّم للؤي</>}</Button> : <Button type="button" disabled={isSubmitting} onClick={() => setActiveIndex(value => Math.min(questions.length - 1, value + 1))} className="bg-[#315f4d] font-black">التالي<ChevronLeft size={18} /></Button>}</div>
    </main>}
    <Dialog open={Boolean(openedImage)} onOpenChange={open => { if (!open) setOpenedImage(null); }}><DialogContent className="max-h-[calc(100vh-2rem)] max-w-4xl overflow-auto border-[#dce7d7] bg-[#fffdf9] text-right"><DialogHeader><DialogTitle>صورة السؤال</DialogTitle><DialogDescription>افتح الصورة بالحجم المناسب للمراجعة ثم ارجع للسؤال.</DialogDescription></DialogHeader>{openedImage ? <img src={storageImageUrl(openedImage.storageKey)} alt={openedImage.alt} className="mx-auto max-h-[68vh] w-auto max-w-full rounded-2xl object-contain" /> : null}</DialogContent></Dialog>
  </div>;
}

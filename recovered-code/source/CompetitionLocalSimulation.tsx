import { CheckCircle2, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { useState } from "react";

export type LocalSimulationQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

/** بيانات تعليمية ثابتة للمحاكاة فقط؛ لا تمثل أي كتاب أو مباراة أو حساب مستخدم. */
export const LOCAL_SIMULATION_QUESTIONS: LocalSimulationQuestion[] = [
  {
    prompt: "ما الذي يثبت إجابة سؤال في مباراة لؤي الحقيقية؟",
    options: ["لقطة مصدر محفوظة", "تخمين المتصفح", "إجابة لاعب آخر", "رقم عشوائي"],
    correctIndex: 0,
    explanation: "المباراة الحقيقية تعتمد على لقطة مصدر محفوظة وتقييم خادمي؛ المحاكاة هنا لا تستخدم أياً منهما.",
  },
  {
    prompt: "ماذا يحدث في المحاكاة المحلية عند اختيار إجابة؟",
    options: ["تُرسل للخادم", "تُحفظ في قاعدة البيانات", "تُقيّم داخل المتصفح فقط", "تغيّر سجل الانتصارات"],
    correctIndex: 2,
    explanation: "الإجابة التدريبية تُقيّم داخل هذه البطاقة فقط، ولا يوجد طلب شبكة أو تغيير في بيانات المنصة.",
  },
  {
    prompt: "ما الغرض من وضع المحاكاة؟",
    options: ["تجربة شكل الجولة", "إطلاق مباراة حقيقية", "تعديل بنك الأسئلة", "دعوة لاعب ثانٍ"],
    correctIndex: 0,
    explanation: "الغرض هو تجربة ترتيب السؤال والإجابة والنتيجة قبل استخدام مباراة حقيقية بين سيف وحنين.",
  },
];

export function scoreLocalSimulationAnswer(question: LocalSimulationQuestion, answerIndex: number) {
  return answerIndex === question.correctIndex ? 1 : 0;
}

export default function CompetitionLocalSimulation() {
  const [started, setStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const question = LOCAL_SIMULATION_QUESTIONS[questionIndex];
  const finished = started && !question;

  const start = () => { setStarted(true); setQuestionIndex(0); setScore(0); setSelectedIndex(null); };
  const choose = (answerIndex: number) => {
    if (selectedIndex !== null || !question) return;
    setSelectedIndex(answerIndex);
    setScore(current => current + scoreLocalSimulationAnswer(question, answerIndex));
  };
  const next = () => { setQuestionIndex(current => current + 1); setSelectedIndex(null); };

  return <section className="mb-5 overflow-hidden rounded-[1.45rem] border border-[#d8e2ec] bg-[#f8fbff] p-5" aria-label="محاكاة محلية لمباراة لؤي" data-local-simulation>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="card-kicker text-[#55728d]">تجربة بدون جهاز ثانٍ</p><h2 className="mt-1 text-lg font-black text-[#2f4b61]">محاكاة محلية للمباراة</h2></div><span className="inline-flex items-center gap-1 rounded-full bg-[#e4eff9] px-2.5 py-1 text-[10px] font-black text-[#3e6d91]"><Sparkles size={13} />محاكاة فقط</span></div>
    <p className="mt-2 max-w-3xl text-sm leading-7 text-[#637b8d]">جرّبوا شكل السؤال والاختيارات والنتيجة من جهاز واحد. البيانات تدريبية ثابتة، ولا يتم إنشاء غرفة أو حفظ نقاط أو إرسال إجابات للخادم.</p>
    {!started ? <button type="button" onClick={start} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#3e6d91] px-4 py-3 text-sm font-black text-white transition-transform active:scale-[.97]"><Sparkles size={16} />ابدأ المحاكاة</button> : finished ? <div className="mt-4 rounded-2xl border border-[#cfe4d0] bg-white p-4"><div className="flex items-center gap-2 text-[#3d7048]"><Trophy size={19} /><p className="text-sm font-black">خلصت المحاكاة: {score} من {LOCAL_SIMULATION_QUESTIONS.length}</p></div><p className="mt-2 text-xs leading-6 text-[#6c7c72]">النتيجة محلية ولم تُضف إلى سجل الانتصارات أو الإحصاءات.</p><button type="button" onClick={start} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#edf5ea] px-3 py-2 text-xs font-black text-[#3e6d91]"><RotateCcw size={14} />إعادة المحاكاة</button></div> : <div className="mt-4 rounded-2xl border border-[#dbe8f1] bg-white p-4"><div className="flex items-center justify-between gap-2"><p className="text-[11px] font-black text-[#55728d]">سؤال {questionIndex + 1} من {LOCAL_SIMULATION_QUESTIONS.length}</p><p className="text-[11px] font-black text-[#6c7c72]">النقاط المحلية: {score}</p></div><h3 className="mt-3 text-sm font-black leading-7 text-[#344f62]">{question.prompt}</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map((option, index) => { const chosen = selectedIndex === index; const correct = selectedIndex !== null && index === question.correctIndex; return <button key={option} type="button" disabled={selectedIndex !== null} onClick={() => choose(index)} className={`rounded-xl border px-3 py-2.5 text-right text-xs font-bold transition-colors ${correct ? "border-[#acd3b0] bg-[#eef9ee] text-[#3d7048]" : chosen ? "border-[#e4b6b0] bg-[#fff2f0] text-[#94544d]" : "border-[#e1eaf0] bg-[#fbfdff] text-[#536d7d] hover:border-[#9fc1d8]"}`}>{option}{correct ? <CheckCircle2 className="ms-1 inline-block" size={14} /> : null}</button>; })}</div>{selectedIndex !== null ? <div className="mt-3 rounded-xl bg-[#f4f8fb] p-3 text-xs leading-6 text-[#607887]" role="status">{selectedIndex === question.correctIndex ? "إجابة صحيحة في التدريب. " : "الإجابة التدريبية مختلفة. "}{question.explanation}<button type="button" onClick={next} className="mt-2 block rounded-lg bg-[#e4eff9] px-3 py-2 font-black text-[#3e6d91]">{questionIndex + 1 === LOCAL_SIMULATION_QUESTIONS.length ? "عرض النتيجة" : "السؤال التالي"}</button></div> : null}</div>}
  </section>;
}

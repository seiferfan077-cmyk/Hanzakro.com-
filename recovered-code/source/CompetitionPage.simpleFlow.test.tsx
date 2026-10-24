import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./CompetitionPage.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

describe("مسار المنافسة المبسط", () => {
  it("يوجه كتاباً واحداً أو PDF واحداً إلى تحضير لؤي قبل إنشاء المنافسة", () => {
    expect(page).toContain("CompetitionPreparationFlow");
    expect(page).toContain("يكفي كتاب واحد من «كتبي» أو PDF مرفوع مباشرةً");
    expect(page).toContain("خلّي لؤي يجهّز المنافسة");
    expect(page).toContain("لؤي يراجع المصدر ويحضر أسئلة الجولة");
    expect(page).toContain('source.pageEnd ? `من صفحة ${source.pageStart} إلى صفحة ${source.pageEnd}` : `من صفحة ${source.pageStart}`');
  });

  it("يعرض دخول سيف وحنين كـ 1/2 و2/2 قبل بدء السؤال", () => {
    expect(page).toContain("دخول اللاعبين: {joined} من 2");
    expect(page).toContain("بدء المنافسة · 1 من 2");
    expect(page).toContain("بدء المنافسة · دخول 2 من 2");
    expect(page).toContain("تأكيد الجاهزية");
  });

  it("يبني خريطة التحضير من حالة المصدر وسجل الدعم وحالة البنك، من غير نسب شكلية", () => {
    expect(page).toContain("خريطة التحضير الفعلية");
    expect(page).toContain("بحث تلقائي واحد");
    expect(page).toContain("عمليات بحث تلقائي");
    expect(page).toContain("ما اتسجلش مصدر ويب مساعد؛ لؤي هيعتمد على المصدر الأساسي بس.");
    expect(page).toContain("اتحفظ البنك كامل واتقفل للتعديل لحماية تطابق أسئلة الجولة.");
    expect(page).toContain("كل مرحلة تحت مبنية على حالة المحرك وسجل المصدر الموجودين فعلاً");
  });

  it("يوضح انقطاع اللاعب من الحالة الخادمية من غير إلغاء الغرفة أو إعادة السؤال", () => {
    expect(page).toContain("CompetitionDisconnectNotice");
    expect(page).toContain("الاتصال انقطع عند");
    expect(page).toContain("الغرفة والأسئلة اللي اتفتحت محفوظة");
    expect(page).toContain("الانقطاع ما بيلغيش المباراة ولا بيعيد السؤال");
    expect(page).toContain("المؤقت الخادمي للسؤال ما زال شغال");
  });

  it("يفصل كتاب كتبي عن PDF المرفوع ويشرح النطاق والنص القابل للفهرسة", () => {
    expect(page).toContain("كتاب من «كتبي» ونطاق صفحات");
    expect(page).toContain("PDF مرفوع مباشرة للمحرك");
    expect(page).toContain("نطاق الصفحات لازم يبدأ من رقم أقل أو يساوي صفحة النهاية.");
    expect(page).toContain("اكتب رقم بداية ونهاية معاً، أو سيب الحقلين فاضيين.");
    expect(page).toContain("PDF قابل للبحث حتى 30 ميغابايت");
    expect(page).toContain("لا يتحفظ في «كتبي»");
  });

  it("يسمح للكتاب المفهرس كاملاً عند عدم اختيار نطاق ويحمي النطاق الجزئي", () => {
    expect(page).toContain("const rangeIsPartial = Boolean(pageStart) !== Boolean(pageEnd)");
    expect(page).toContain("سيبوا الحقلين فاضيين لاستخدام الكتاب كله");
    expect(page).toContain("استخدام الكتاب كله");
    expect(page).toContain("pageStart: pageStart ? Number(pageStart) : undefined");
  });

  it("يجعل الكتب وPDF والصور مصدر الجلسة ويبدأ البحث المساعد من هذه المواد", () => {
    expect(page).toContain("مصدر الجلسة");
    expect(page).toContain("اختاروا كتباً أو PDF أو صوراً — وامزجوهم لو تحبوا");
    expect(page).toContain("لا تكتبوا له رابطاً أو مصدر بحث يدوياً");
    expect(page).toContain("refreshAutomaticWebResearch");
    expect(page).toContain("بدء البحث المساعد");
    expect(page).toContain("CompetitionImageSourcePicker");
  });

  it("يعرض بوابة بثلاث بطاقات قابلة للرجوع وتربط النمط بالفعل الخادمي المناسب", () => {
    expect(page).toContain("CompetitionEngineGateway");
    expect(page).toContain("ثلاث بطاقات فقط لبدء الجولة");
    expect(page).toContain("مصدر الجلسة");
    expect(page).toContain("مراجعة وتحضير لؤي");
    expect(page).toContain("اختيار الغرفة");
    expect(page).toContain("العودة للبطاقات");
    expect(page).toContain("البطاقة 1 · مصدر الجلسة");
    expect(page).toContain("بدء المنافسة ضد راشد");
    expect(page).toContain("بدء المنافسة مع الطرف الآخر");
    expect(page).toContain("mode === \"rashed\" ? onStartRashed : onStartDuel");
    expect(page).toContain("onStartDuel={() => { if (member && selectedId) createMatch.mutate");
    expect(page).toContain("onStartRashed={() => { if (member && selectedId) createRashedMatch.mutate");
    expect(page).toContain('data-competition-layout={selected && !match ? activeEngineStep ?? "cards" : "full"}');
    expect(css).toContain('data-competition-layout="cards"');
    expect(css).toContain('data-competition-layout="mode"] > section:nth-of-type(n+4)');
    expect(css).toContain('data-competition-layout="prepare"] > section:nth-of-type(n+4)');
  });

  it("لا يعرض مسار النص اليدوي الموروث في واجهة تجهيز المصدر", () => {
    expect(page).toContain("الصق محتوى الدرس أو التعليمات…");
    expect(page).toContain("const hideLegacyTextSource");
    expect(page).toContain('setAttribute("hidden", "")');
  });

  it("يعرض الدعوة الثنائية من قائمة منبثقة ولا يدخلها إلا من زر صريح", () => {
    expect(page).toContain("pendingInvitationsQuery");
    expect(page).toContain("CompetitionInvitationMenu");
    expect(page).toContain("دعوات المنافسة ({invitations.length})");
    expect(page).toContain("اختار الغرفة اللي حابب تدخلها");
    expect(page).toContain("الدعوة اختيارية تماماً");
    expect(page).toContain("دعوة من {memberLabel(invitation.createdBy)} إلى غرفة سيف وحنين");
    expect(page).toContain("ادخل هذه الغرفة");
    expect(page).toContain("setInvitationsOpen(false)");
    expect(page).toContain("pendingInvitations.invalidate");
  });

  it("يعرض حذفاً واضحاً بجانب كل محرك ويطلب التأكيد مع حفظ سجل الجلسة", () => {
    expect(page).toContain("اختاروا محرك للتجهيز أو احذفوه");
    expect(page).toContain("حذف المحرك نهائياً");
    expect(page).toContain("setEnginePendingDeletion(engine)");
    expect(page).toContain("event.stopPropagation()");
    expect(page).toContain("سيُحذف محرك");
    expect(page).toContain("سجل المنافسات والإنجازات ونتائج الجولات هيفضلوا محفوظين");
  });

  it("يؤكد الرجوع من بطاقات المحرك ويضيف تفاعل بخارياً ناعماً", () => {
    expect(page).toContain("CompetitionSteamBackButton");
    expect(page).toContain("ترجع لبطاقات المحرك؟");
    expect(page).toContain("playReturnConfirmationTone");
    expect(page).toContain("مراجعة ما سيُحفظ قبل الرجوع");
    expect(page).toContain("هيفضل محفوظ");
    expect(page).toContain("سجل المنافسات والنتائج والإنجازات");
    expect(page).toContain("البقاء في المحرك");
    expect(page).toContain("العودة للبطاقات");
    expect(page).toContain("window.setTimeout(onConfirm, 180)");
    expect(css).toContain("competition-steam-return");
    expect(css).toContain("steam-return-puff");
    expect(css).toContain("prefers-reduced-motion: no-preference");
    expect(page).toContain("competition-achievement-celebration");
    expect(page).toContain("جلسة المنافسة اتحفظت بنجاح");
    expect(css).toContain("competition-achievement-medal");
    expect(css).toContain("competition-achievement-enter");
    expect(page).toContain("competition-confetti");
    expect(css).toContain("competition-confetti-fall");
    expect(page).toContain("CompetitionProgressChart");
    expect(page).toContain("competition-chart-line");
    expect(page).toContain("timedOutSessionCount");
    expect(page).toContain("timedOutQuestionCount");
    expect(page).toContain("الجلسات التي تجاوزت المهلة");
    expect(page).toContain("downloadCsv");
    expect(page).toContain("downloadExcel");
    expect(page).toContain("saf-haneen-competition-${rangeMode}.csv");
    expect(page).toContain("saf-haneen-competition-${rangeMode}.xlsx");
    expect(page).toContain("FileSpreadsheet");
    expect(page).toContain("CompetitionSoundToggle");
    expect(page).toContain("COMPETITION_SOUND_STORAGE_KEY");
    expect(page).toContain("المؤثرات الصوتية: تشغيل");
    expect(css).toContain("competition-sound-toggle");
    expect(page).toContain("CompetitionHistorySkeleton");
    expect(page).toContain('aria-label="جاري تحميل إنجازات المنافسة"');
    expect(page).toContain("history.isLoading");
    expect(page).toContain("history.isFetching");
    expect(page).toContain("CompetitionQuickComparison");
    expect(page).toContain("المقارنة مبنية على جلسات السجل المحفوظة فعلياً");
    expect(page).toContain("إعادة المحاولة");
    expect(css).toContain("competition-history-skeleton");
    expect(css).toContain("competition-skeleton-shimmer");
    expect(css).toContain("competition-quick-comparison");
    expect(page).toContain("CompetitionPerformanceSparkline");
    expect(page).toContain("CompetitionTrendBadge");
    expect(page).toContain("competitionTrend");
    expect(page).toContain("في تحسن");
    expect(page).toContain("يحتاج دفعة");
    expect(page).toContain("بيانات أولية");
    expect(page).toContain("competition-performance-trends");
    expect(page).toContain("performanceSeries");
    expect(css).toContain("competition-trend-badge");
    expect(css).toContain("competition-performance-sparkline");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});

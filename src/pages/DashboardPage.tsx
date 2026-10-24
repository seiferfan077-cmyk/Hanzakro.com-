import { Link } from 'react-router-dom';
import DashboardLinkCard from '../features/dashboard/DashboardLinkCard';
import DashboardReadinessCard from '../features/dashboard/DashboardReadinessCard';

const sections = [
  {
    to: '/study',
    number: '01',
    title: 'مساحة المذاكرة',
    description: 'انتقل إلى صفحة المذاكرة التأسيسية؛ تنظيم الجلسات قيد التطوير.',
    status: 'تأسيسي',
  },
  {
    to: '/competitions',
    number: '02',
    title: 'المنافسات',
    description: 'افتح صفحة المنافسات، ثم نربط الوحدات القديمة بعد مراجعتها.',
    status: 'قيد التجهيز',
  },
  {
    to: '/vocabulary',
    number: '03',
    title: 'المفردات والتعلّم',
    description: 'واجهة المفردات التأسيسية، دون حفظ تقدم أو مزامنة حاليًا.',
    status: 'قيد التجهيز',
  },
  {
    to: '/chat',
    number: '04',
    title: 'مساعد لؤي',
    description: 'معاينة محادثة محلية؛ لا يوجد اتصال فعلي بالذكاء الاصطناعي بعد.',
    status: 'معاينة محلية',
  },
];

function DashboardPage() {
  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome" aria-labelledby="dashboard-title">
        <div className="dashboard-welcome-copy">
          <p className="eyebrow"><span className="status-dot" /> لوحة المستخدم · نسخة تأسيسية</p>
          <h1 id="dashboard-title">أهلًا بك في <span>هنذاكروا.</span></h1>
          <p>من هنا تصل إلى مساحات التعلّم. نضيف الأقسام تدريجيًا، ونوضح ما هو جاهز وما لم يُربط بعد.</p>
          <div className="dashboard-welcome-actions">
            <Link className="button button-primary" to="/study">ابدأ من المذاكرة <span aria-hidden="true">←</span></Link>
            <Link className="dashboard-text-link" to="/chat">افتح مساعد لؤي</Link>
          </div>
        </div>
        <aside className="dashboard-stage-card" aria-label="حالة المنصة">
          <span className="dashboard-stage-mark" aria-hidden="true">هـ</span>
          <p className="dashboard-stage-label">حالة النسخة</p>
          <h2>الواجهة قيد البناء</h2>
          <p>لا يوجد حساب دخول أو مزامنة بيانات في هذه المرحلة.</p>
        </aside>
      </section>

      <section className="dashboard-sections" aria-labelledby="dashboard-sections-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="eyebrow">وصول سريع</p>
            <h2 id="dashboard-sections-title">مساحاتك التعليمية</h2>
          </div>
          <span className="dashboard-section-count">{sections.length} أقسام أولية</span>
        </div>
        <div className="dashboard-card-grid">
          {sections.map((section) => <DashboardLinkCard key={section.to} {...section} />)}
        </div>
      </section>

      <div className="dashboard-bottom-grid">
        <DashboardReadinessCard />
        <section className="dashboard-next-card" aria-labelledby="dashboard-next-title">
          <p className="eyebrow">الخطوة التالية</p>
          <h2 id="dashboard-next-title">نربط الواجهة ببيانات حقيقية بعد تحديد الحسابات والصلاحيات.</h2>
          <p>لوحة الإدارة مختلفة عن لوحة المستخدم؛ لن نضيف إجراءات إدارية قبل تحديد الأدوار وتسجيل الدخول وحماية المسارات.</p>
          <Link to="/" className="dashboard-next-link">العودة إلى الصفحة العامة <span aria-hidden="true">↗</span></Link>
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;

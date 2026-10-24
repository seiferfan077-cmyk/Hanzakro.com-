const learningAreas = [
  {
    number: '01',
    title: 'مساحة المذاكرة',
    description: 'مكان لتنظيم المواد والجلسات والخطوات القادمة.',
  },
  {
    number: '02',
    title: 'المنافسات',
    description: 'مساحة للمسابقات وغرف التحدّي التي ظهرت في ملفات المشروع المسترجعة.',
  },
  {
    number: '03',
    title: 'مساعد لؤي',
    description: 'فكرة المساعد التعليمي كما تظهر في وحدات الكود، وتحتاج إلى ربط خدماتها.',
  },
  {
    number: '04',
    title: 'المفردات والتعلّم',
    description: 'أدوات للمفردات والتدريب سنعيد بناءها بعد اكتمال أساس التطبيق.',
  },
];

function App() {
  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="هنذاكروا — الصفحة الرئيسية">
          <span className="brand-mark" aria-hidden="true">هـ</span>
          <span className="brand-name">هنذاكروا</span>
        </a>

        <nav className="topnav" aria-label="التنقل الرئيسي">
          <a href="#areas">مساحات التعلّم</a>
          <a href="#next-step">الخطوة التالية</a>
        </nav>

        <a className="topbar-link" href="#next-step">عن المشروع <span aria-hidden="true">↗</span></a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> نسخة تأسيسية — العمل مستمر</p>
            <h1 id="hero-title">خطوة بخطوة،<br /><span>هنذاكروا سوا.</span></h1>
            <p className="hero-description">
              نعيد بناء المنصة على أساس واضح وقابل للتطوير. هذه بداية المشروع؛
              المزايا الظاهرة أدناه خريطة لما سنراجعه ونوصله، وليست خدمات مكتملة بعد.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#areas">استكشف ملامح المنصة <span aria-hidden="true">←</span></a>
              <a className="text-link" href="#next-step">كيف سنكمل؟</a>
            </div>
            <div className="hero-note">
              <span className="note-mark" aria-hidden="true">✳</span>
              <p><strong>البداية الصحيحة أهم من السرعة.</strong><br />نبني الأساس، ثم نضيف كل ميزة ونختبرها.</p>
            </div>
          </div>

          <aside className="build-card" aria-label="حالة تأسيس المنصة">
            <div className="card-heading">
              <span className="card-kicker">خريطة البناء</span>
              <span className="card-index">01 / 04</span>
            </div>
            <div className="build-illustration" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit-center"><span>هـ</span></div>
              <span className="orbit-chip chip-one">فهم</span>
              <span className="orbit-chip chip-two">تعلّم</span>
              <span className="orbit-chip chip-three">تقدّم</span>
            </div>
            <div className="card-footer">
              <div>
                <p className="card-label">المرحلة الحالية</p>
                <p className="card-title">تأسيس التطبيق</p>
              </div>
              <span className="status-pill"><span className="status-dot" /> جارٍ العمل</span>
            </div>
          </aside>
        </section>

        <section className="areas-section" id="areas" aria-labelledby="areas-title">
          <div className="section-intro">
            <div>
              <p className="eyebrow">ملامح من المواد المسترجعة</p>
              <h2 id="areas-title">ما الذي نعيد بناءه؟</h2>
            </div>
            <p className="section-description">
              هذه أسماء مجالات ظهرت في الأكواد القديمة. سنفحص كل وحدة قبل ربطها،
              ونتأكد من احتياجاتها بدل افتراض أنها تعمل كما هي.
            </p>
          </div>

          <div className="areas-list">
            {learningAreas.map((area) => (
              <article className="area-row" key={area.number}>
                <span className="area-number">{area.number}</span>
                <h3>{area.title}</h3>
                <p>{area.description}</p>
                <span className="area-status">ضمن المراجعة</span>
              </article>
            ))}
          </div>
        </section>

        <section className="next-section" id="next-step" aria-labelledby="next-title">
          <div className="next-marker" aria-hidden="true">02</div>
          <div>
            <p className="eyebrow">الخطوة التالية</p>
            <h2 id="next-title">الأساس أولًا، ثم نبني فوقه.</h2>
            <p>بعد التأكد من تشغيل هذه النسخة، نراجع الملفات المسترجعة ونختار أول ميزة نربطها معًا.</p>
          </div>
          <a className="button button-light" href="#top">العودة إلى البداية <span aria-hidden="true">↑</span></a>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark" aria-hidden="true">هـ</span>
          <span className="brand-name">هنذاكروا</span>
        </a>
        <p>منصة قيد البناء — خطوة بخطوة.</p>
      </footer>
    </div>
  );
}

export default App;

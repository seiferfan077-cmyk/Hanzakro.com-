import { Link } from 'react-router-dom';

const learningAreas = [
  { number: '01', title: 'مساحة المذاكرة', description: 'مكان لتنظيم المواد والجلسات والخطوات القادمة.', to: '/study' },
  { number: '02', title: 'المنافسات', description: 'مساحة المسابقات وغرف التحدّي الظاهرة في الأكواد المسترجعة.', to: '/competitions' },
  { number: '03', title: 'مساعد لؤي', description: 'المساعد التعليمي كما يظهر في الوحدات القديمة، ويحتاج ربط خدماته.', to: '/assistant' },
  { number: '04', title: 'المفردات والتعلّم', description: 'أدوات للمفردات والتدريب سنعيد بناءها بعد مراجعة الملفات.', to: '/vocabulary' },
];

function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> نسخة تأسيسية — العمل مستمر</p>
          <h1 id="hero-title">خطوة بخطوة،<br /><span>هنذاكروا سوا.</span></h1>
          <p className="hero-description">
            نعيد بناء المنصة على أساس واضح وقابل للتطوير. الصفحات جاهزة كبنية أولية؛
            أما الخدمات والبيانات فسنوصلها بعد مراجعة الأكواد واعتماد احتياجات كل جزء.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/study">ابدأ من مساحة المذاكرة <span aria-hidden="true">←</span></Link>
            <a className="text-link" href="#areas">تعرّف على الأقسام</a>
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
              <p className="card-title">تأسيس التطبيق والمسارات</p>
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
            ظهرت هذه المجالات في الأكواد القديمة. سنفحص كل وحدة قبل ربطها،
            ونتأكد من احتياجاتها بدل افتراض أنها تعمل كما هي.
          </p>
        </div>

        <div className="areas-list">
          {learningAreas.map((area) => (
            <Link className="area-row area-row-link" key={area.number} to={area.to}>
              <span className="area-number">{area.number}</span>
              <h3>{area.title}</h3>
              <p>{area.description}</p>
              <span className="area-status">قيد المراجعة</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="next-section" aria-labelledby="next-title">
        <div className="next-marker" aria-hidden="true">02</div>
        <div>
          <p className="eyebrow">الخطوة التالية</p>
          <h2 id="next-title">الأساس أولًا، ثم نبني فوقه.</h2>
          <p>نراجع الوحدات المسترجعة ونختار أول ميزة يمكن ربطها واختبارها بوضوح.</p>
        </div>
        <Link className="button button-light" to="/study">استكشف الصفحات <span aria-hidden="true">←</span></Link>
      </section>
    </>
  );
}

export default HomePage;

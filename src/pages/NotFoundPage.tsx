import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="section-page not-found-page" aria-labelledby="not-found-title">
      <p className="eyebrow">404 — المسار غير موجود</p>
      <h1 id="not-found-title" className="section-page-title">الصفحة التي تبحث عنها غير متاحة هنا.</h1>
      <p className="section-page-description">تحقق من الرابط أو عد إلى الصفحة الرئيسية لمتابعة استكشاف المشروع.</p>
      <Link className="button button-primary" to="/">العودة إلى الرئيسية <span aria-hidden="true">←</span></Link>
    </section>
  );
}

export default NotFoundPage;

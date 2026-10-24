function DashboardReadinessCard() {
  return (
    <section className="dashboard-readiness" aria-labelledby="dashboard-readiness-title">
      <div className="dashboard-readiness-heading">
        <div>
          <p className="eyebrow">المتابعة</p>
          <h2 id="dashboard-readiness-title">تقدّمك الدراسي</h2>
        </div>
        <span className="dashboard-not-connected">غير موصول ببيانات حساب</span>
      </div>
      <div className="dashboard-empty-progress">
        <span className="dashboard-empty-icon" aria-hidden="true">↗</span>
        <div>
          <h3>سيظهر تقدمك هنا بعد ربط البيانات.</h3>
          <p>لم نضف أرقامًا أو سجلًا تجريبيًا؛ سنعرض تقدمك الحقيقي بعد إعداد الحساب وحفظ جلسات المذاكرة.</p>
        </div>
      </div>
    </section>
  );
}

export default DashboardReadinessCard;

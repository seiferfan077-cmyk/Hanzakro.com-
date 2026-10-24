import { Link } from 'react-router-dom';

function SiteFooter() {
  return (
    <footer className="footer">
      <Link className="brand footer-brand" to="/">
        <span className="brand-mark" aria-hidden="true">هـ</span>
        <span className="brand-name">هنذاكروا</span>
      </Link>
      <p>منصة قيد البناء — خطوة بخطوة.</p>
    </footer>
  );
}

export default SiteFooter;

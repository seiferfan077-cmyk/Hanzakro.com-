import { Link, NavLink } from 'react-router-dom';

const navigation = [
  { to: '/study', label: 'مذاكرتي' },
  { to: '/competitions', label: 'المنافسات' },
  { to: '/vocabulary', label: 'المفردات' },
  { to: '/assistant', label: 'مساعد لؤي' },
];

function SiteHeader() {
  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="هنذاكروا — الصفحة الرئيسية">
        <span className="brand-mark" aria-hidden="true">هـ</span>
        <span className="brand-name">هنذاكروا</span>
      </Link>

      <nav className="topnav" aria-label="التنقل الرئيسي">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => isActive ? 'nav-link nav-link-active' : 'nav-link'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Link className="topbar-link" to="/">الصفحة الرئيسية <span aria-hidden="true">↗</span></Link>
    </header>
  );
}

export default SiteHeader;

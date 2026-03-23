import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { label: 'Dashboard',        path: '/admin',                icon: '📊' },
  { label: 'Pending Salaries', path: '/admin/salaries',       icon: '⏳' },
  { label: 'Companies',        path: '/admin/companies',      icon: '🏢' },
  { label: 'Job Functions',    path: '/admin/job-functions',  icon: '⚙️' },
  { label: 'Level Guide',      path: '/admin/guide-levels',   icon: '🗂' },
  { label: 'Opportunities',    path: '/admin/opportunities',  icon: '🎯' },
  { label: 'Audit Logs',       path: '/admin/audit',          icon: '📋' },
  { label: 'Analytics',        path: '/admin/analytics',      icon: '📈' },
];

export default function AdminSidebar() {
  const { pathname } = useLocation();
  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile via CSS) ── */}
      <div className="admin-sidebar">
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 12, padding: '0 4px' }}>
          Admin Panel
        </div>
        <ul className="sidebar-nav">
          {NAV.map(({ label, path, icon }) => (
            <li key={path}>
              <Link to={path} className={pathname === path ? 'active' : ''}>
                <span>{icon}</span>{label}
              </Link>
            </li>
          ))}
        </ul>
        <div style={{ position: 'absolute', bottom: 16, left: 12, right: 12 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-2)' }}>
            ← Back to site
          </Link>
        </div>
      </div>

      {/* ── Mobile horizontal scroll nav (shown only on mobile via CSS) ── */}
      <div className="admin-mobile-topbar">
        {NAV.map(({ label, path, icon }) => (
          <Link key={path} to={path} className={pathname === path ? 'active' : ''}>
            <span>{icon}</span>
            {label}
          </Link>
        ))}
        <Link to="/" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
          ← Site
        </Link>
      </div>
    </>
  );
}

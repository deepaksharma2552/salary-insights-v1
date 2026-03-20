import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { label: 'Dashboard',        path: '/admin',              icon: '📊' },
  { label: 'Pending Salaries', path: '/admin/salaries',     icon: '⏳' },
  { label: 'Companies',        path: '/admin/companies',    icon: '🏢' },
  { label: 'Level Guide',      path: '/admin/guide-levels', icon: '🗂' },
  { label: 'Referrals',        path: '/admin/referrals',    icon: '🔗' },
  { label: 'Audit Logs',       path: '/admin/audit',        icon: '📋' },
];

export default function AdminSidebar() {
  const { pathname } = useLocation();
  return (
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
  );
}

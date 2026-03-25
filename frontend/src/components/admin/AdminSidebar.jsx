import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const NAV = [
  { label: 'Dashboard',          path: '/admin',                   icon: '📊' },
  { label: 'Pending Salaries',   path: '/admin/salaries',          icon: '⏳' },
  { label: 'Approved Salaries',  path: '/admin/salaries/approved', icon: '✅' },
  { label: 'Companies',          path: '/admin/companies',         icon: '🏢' },
  { label: 'Job Functions',      path: '/admin/job-functions',     icon: '⚙️' },
  { label: 'Level Guide',        path: '/admin/guide-levels',      icon: '🗂' },
  { label: 'Opportunities',      path: '/admin/opportunities',     icon: '🎯' },
  { label: 'Audit Logs',         path: '/admin/audit',             icon: '📋' },
  { label: 'Analytics',          path: '/admin/analytics',         icon: '📈' },
];

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="admin-mobile-toggle"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle admin menu"
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 89,
          }}
        />
      )}

      {/* Sidebar — always visible on desktop, slide-in on mobile */}
      <div
        className="admin-sidebar"
        style={mobileOpen ? {
          display: 'flex',
          flexDirection: 'column',
          transform: 'translateX(0)',
          transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
        } : undefined}
      >
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: 12, padding: '0 4px' }}>
          Admin Panel
        </div>
        <ul className="sidebar-nav">
          {NAV.map(({ label, path, icon }) => (
            <li key={path}>
              <Link
                to={path}
                className={pathname === path ? 'active' : ''}
              >
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
    </>
  );
}

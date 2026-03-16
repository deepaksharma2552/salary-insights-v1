import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { label: 'Dashboard',     path: '/admin',           icon: '📊' },
  { label: 'Pending Salaries', path: '/admin/salaries', icon: '⏳' },
  { label: 'Companies',     path: '/admin/companies',  icon: '🏢' },
  { label: 'Audit Logs',    path: '/admin/audit',      icon: '📋' },
];

export default function AdminSidebar() {
  const { pathname } = useLocation();

  return (
    <div style={{
      width: 240,
      background: 'var(--ink-2)',
      borderRight: '1px solid var(--border)',
      padding: '32px 16px',
      position: 'fixed',
      top: 68, left: 0, bottom: 0,
      overflowY: 'auto',
      zIndex: 50,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: 10, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-3)', marginBottom: 16, paddingLeft: 12,
      }}>
        Admin Panel
      </div>

      {NAV.map(({ label, path, icon }) => {
        const active = pathname === path;
        return (
          <Link key={path} to={path} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8,
              fontSize: 14, fontWeight: 500, marginBottom: 4,
              color: active ? 'var(--gold)' : 'var(--text-3)',
              background: active ? 'var(--gold-dim)' : 'transparent',
              border: active ? '1px solid rgba(212,168,83,0.15)' : '1px solid transparent',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--ink-3)'; e.currentTarget.style.color = 'var(--text-2)'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; } }}
            >
              <span style={{ fontSize: 15 }}>{icon}</span>
              {label}
            </div>
          </Link>
        );
      })}

      <div style={{
        position: 'absolute', bottom: 24, left: 16, right: 16,
        padding: '12px 16px',
        background: 'var(--ink-3)',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          ← Back to site
        </Link>
      </div>
    </div>
  );
}

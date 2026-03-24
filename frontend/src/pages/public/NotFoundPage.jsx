import { Link, useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="section" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>

        {/* Big 404 */}
        <div style={{
          fontSize: 96, fontWeight: 900, lineHeight: 1,
          fontFamily: "'IBM Plex Mono', monospace",
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>
          404
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 10 }}>
          Page not found
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 32 }}>
          The page you're looking for doesn't exist or may have been moved.
          Here are some helpful links instead:
        </p>

        {/* Quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {[
            { to: '/',             label: '🏠  Home' },
            { to: '/salaries',     label: '💰  Browse Salaries' },
            { to: '/companies',    label: '🏢  Companies' },
            { to: '/opportunities',label: '🚀  Opportunities' },
            { to: '/dashboard',    label: '📊  Analytics Dashboard' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{
                display: 'block', padding: '10px 16px', borderRadius: 8,
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                fontSize: 13, fontWeight: 500, color: 'var(--text-1)',
                textDecoration: 'none', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {label}
            </Link>
          ))}
        </div>

        <button
          onClick={() => navigate(-1)}
          style={{
            fontSize: 12, color: 'var(--text-3)', background: 'none',
            border: 'none', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          ← Go back
        </button>
      </div>
    </section>
  );
}

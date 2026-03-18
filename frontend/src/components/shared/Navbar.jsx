import { Link, useLocation } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar() {
  const location         = useLocation();
  const { user, logout } = useContext(AuthContext);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const isActive    = (path) => location.pathname === path ? 'active' : '';

  const displayName = user
    ? (user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : user.email)
    : null;

  return (
    <nav className="navbar">

      {/* ── LOGO ── */}
      <Link to="/" className="nav-logo" style={{ textDecoration: 'none' }}>
        {/* Spinning rings icon */}
        <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
          {/* Outer ring */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2.5px solid transparent',
            borderTopColor: '#0ea5e9',
            borderRightColor: '#7dd3fc',
            animation: 'navRingSpin 3s linear infinite',
          }} />
          {/* Inner ring */}
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '50%',
            border: '1.5px solid transparent',
            borderBottomColor: '#e0f2fe',
            borderLeftColor: '#0284c7',
            animation: 'navRingSpinRev 2s linear infinite',
            opacity: 0.55,
          }} />
          {/* SI block */}
          <div style={{
            position: 'absolute', inset: 8, borderRadius: 6,
            background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1, fontFamily: 'Inter,sans-serif' }}>SI</span>
            <span style={{ fontSize: 5.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.05em', fontFamily: "'IBM Plex Mono',monospace", marginTop: 1 }}>360°</span>
          </div>
        </div>

        {/* Wordmark */}
        <span style={{ display: 'flex', flexDirection: 'column', gap: 0, lineHeight: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-1)', fontFamily: 'Inter,sans-serif' }}>
            Salary<span style={{ color: '#0ea5e9' }}>Insights</span>
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', color: '#0ea5e9', fontFamily: "'IBM Plex Mono',monospace", opacity: 0.8 }}>
            360° COMPENSATION
          </span>
        </span>
      </Link>

      {/* ── NAV LINKS ── */}
      <ul className="nav-links">
        <li><Link to="/"           className={isActive('/')}>Home</Link></li>
        <li><Link to="/salaries"   className={isActive('/salaries')}>Salaries</Link></li>
        <li><Link to="/companies"  className={isActive('/companies')}>Companies</Link></li>
        <li><Link to="/dashboard"  className={isActive('/dashboard')}>Analytics</Link></li>
        {user?.role === 'ADMIN' && (
          <li><Link to="/admin" className={isActive('/admin')}>Admin</Link></li>
        )}
      </ul>

      {/* ── ACTIONS ── */}
      <div className="nav-actions">

        {/* Theme toggle */}
        <button className="theme-toggle" onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {user ? (
          <>
            <span className="nav-welcome">👋 {displayName}</span>
            <Link to="/my-referrals" className={`btn-ghost ${isActive('/my-referrals')}`} style={{ textDecoration: 'none' }}>
              My Referrals
            </Link>
            <button className="btn-ghost" onClick={logout}>Sign out</button>
            <Link to="/refer" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Refer Someone
            </Link>
          </>
        ) : (
          <>
            <Link to="/login"  className="btn-ghost"  style={{ textDecoration: 'none' }}>Sign in</Link>
            <Link to="/submit" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Submit Salary
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

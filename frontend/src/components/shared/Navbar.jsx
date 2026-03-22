import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar() {
  const location          = useLocation();
  const navigate          = useNavigate();
  const { user, logout }  = useContext(AuthContext);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setDropdownOpen(false); }, [location.pathname]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const isActive    = (path) => location.pathname === path ? 'active' : '';

  const displayName = user
    ? (user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : user.email)
    : null;

  function handleLogout() {
    setDropdownOpen(false);
    logout();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <style>{`
        .user-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 200px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          overflow: hidden;
          z-index: 200;
          animation: dropdownIn 0.15s ease;
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          font-size: 13px;
          color: var(--text-2);
          text-decoration: none;
          cursor: pointer;
          background: transparent;
          border: none;
          width: 100%;
          text-align: left;
          transition: background 0.12s;
          font-family: 'Inter', sans-serif;
        }
        .dropdown-item:hover { background: var(--ink-3); color: var(--text-1); }
        .dropdown-item.danger { color: var(--rose); }
        .dropdown-item.danger:hover { background: var(--rose-dim); }
        .dropdown-divider {
          height: 1px;
          background: var(--border);
          margin: 4px 0;
        }
        .dropdown-header {
          padding: 12px 16px 8px;
          border-bottom: 1px solid var(--border);
        }
      `}</style>

      {/* ── LOGO ── */}
      <Link to="/" className="nav-logo" style={{ textDecoration: 'none' }}>
        <style>{`
          @keyframes siOrbitSweepA { from { transform: rotate(-90deg); } to { transform: rotate(270deg); } }
          @keyframes siOrbitSweepB { from { transform: rotate(90deg);  } to { transform: rotate(450deg); } }
          @keyframes siOrbitSweepC { from { transform: rotate(30deg);  } to { transform: rotate(390deg); } }
          @keyframes siOrbitTrack  { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
          @keyframes siOrbitCore   { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
          @keyframes siOrbitPing   { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.3); opacity: 0; } }
          @media (prefers-reduced-motion: reduce) {
            .si-sweep-a,.si-sweep-b,.si-sweep-c,.si-track,.si-core,.si-ping { animation: none !important; }
          }
        `}</style>
        <svg width="36" height="36" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {/* outer ping — blue */}
          <circle className="si-ping" cx="19" cy="19" r="18" stroke="#3b82f6" strokeWidth="0.8" fill="none"
            style={{ transformOrigin: '19px 19px', animation: 'siOrbitPing 3s ease-out infinite' }} />
          {/* orbit track — blue, counter-rotates */}
          <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitTrack 20s linear infinite' }}>
            <circle cx="19" cy="19" r="15" stroke="#3b82f6" strokeWidth="0.7" fill="none" opacity="0.25" strokeDasharray="2.5 2.5" />
          </g>
          {/* inner track — blue subtle */}
          <circle cx="19" cy="19" r="9" stroke="#3b82f6" strokeWidth="0.5" fill="none" opacity="0.12" strokeDasharray="1.5 2" />
          {/* comets — blue shades */}
          <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitSweepA 6s linear infinite' }}>
            <circle cx="19" cy="4" r="2.4" fill="#3b82f6" />
          </g>
          <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitSweepB 6s linear infinite' }}>
            <circle cx="19" cy="4" r="2" fill="#2563eb" />
          </g>
          <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitSweepC 9s linear infinite' }}>
            <circle cx="19" cy="4" r="1.6" fill="#60a5fa" opacity="0.7" />
          </g>
          {/* core — blue */}
          <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitCore 3s ease-in-out infinite' }}>
            <circle cx="19" cy="19" r="7"   fill="#3b82f6" opacity="0.1" />
            <circle cx="19" cy="19" r="4.5" fill="#3b82f6" opacity="0.2" />
            <circle cx="19" cy="19" r="2.8" fill="#3b82f6" />
          </g>
        </svg>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-1)', fontFamily: 'Inter,sans-serif' }}>
            Salary<span style={{ color: '#3b82f6' }}>Insights</span>
          </span>
          <span style={{ fontSize: 8.5, fontWeight: 500, letterSpacing: '0.12em', color: '#3b82f6', fontFamily: "'IBM Plex Mono',monospace", textTransform: 'uppercase', opacity: 0.75 }}>
            360° Career Clarity
          </span>
        </span>
      </Link>

      {/* ── NAV LINKS ── */}
      <ul className="nav-links">
        <li><Link to="/"          className={isActive('/')}>Home</Link></li>
        <li><Link to="/salaries"  className={isActive('/salaries')}>Salaries</Link></li>
        <li><Link to="/companies" className={isActive('/companies')}>Companies</Link></li>
        <li><Link to="/dashboard" className={isActive('/dashboard')}>Analytics</Link></li>
        <li><Link to="/opportunities"  className={isActive('/opportunities')}>Opportunities</Link></li>
        <li><Link to="/launchpad" className={isActive('/launchpad')}>Launchpad</Link></li>
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
            {/* Primary CTAs */}
            <Link
              to="/submit"
              className="btn-ghost"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Share Salary
            </Link>
            <Link
              to="/refer"
              className="btn-primary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              + Add a Referral
            </Link>

            {/* User dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', borderRadius: 99, cursor: 'pointer',
                  background: dropdownOpen ? 'var(--ink-3)' : 'transparent',
                  border: '1px solid var(--border)',
                  transition: 'background 0.15s',
                }}
              >
                {/* Avatar initials */}
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#3b82f6', fontFamily: 'Inter,sans-serif',
                }}>
                  {(user.firstName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </span>
                {/* Chevron */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5"
                  style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {dropdownOpen && (
                <div className="user-dropdown-menu">

                  {/* User info header */}
                  <div className="dropdown-header">
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>{user.email}</div>
                  </div>

                  {/* My Referral Links */}
                  <Link to="/my-referral-links" className="dropdown-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    My Referral Links
                  </Link>

                  <div className="dropdown-divider" />

                  {/* Sign out */}
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                  </button>

                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login"    className="btn-ghost"   style={{ textDecoration: 'none' }}>Sign in</Link>
            <Link to="/register" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

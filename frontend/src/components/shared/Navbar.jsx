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
        <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2.5px solid transparent',
            borderTopColor: '#0ea5e9', borderRightColor: '#7dd3fc',
            animation: 'navRingSpin 3s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 4, borderRadius: '50%',
            border: '1.5px solid transparent',
            borderBottomColor: '#e0f2fe', borderLeftColor: '#0284c7',
            animation: 'navRingSpinRev 2s linear infinite',
            opacity: 0.55,
          }} />
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
        <li><Link to="/"          className={isActive('/')}>Home</Link></li>
        <li><Link to="/salaries"  className={isActive('/salaries')}>Salaries</Link></li>
        <li><Link to="/companies" className={isActive('/companies')}>Companies</Link></li>
        <li><Link to="/dashboard" className={isActive('/dashboard')}>Analytics</Link></li>
        <li><Link to="/referrals" className={isActive('/referrals')}>Referral Board</Link></li>
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
                  background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#0ea5e9', fontFamily: 'Inter,sans-serif',
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

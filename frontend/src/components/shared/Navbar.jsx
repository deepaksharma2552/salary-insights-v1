import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar() {
  const location          = useLocation();
  const navigate          = useNavigate();
  const { user, logout }  = useContext(AuthContext);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [salariesOpen, setSalariesOpen] = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const dropdownRef = useRef(null);
  const salariesRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (salariesRef.current && !salariesRef.current.contains(e.target)) setSalariesOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setSalariesOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const isActive    = (path) => location.pathname === path ? 'active' : '';
  const salariesActive = ['/salaries', '/level-guide', '/benchmark'].includes(location.pathname);

  const displayName = user
    ? (user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : user.email)
    : null;
  const userInitial = (user?.firstName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  function handleLogout() {
    setDropdownOpen(false);
    setMobileOpen(false);
    logout();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <style>{`
        /* ── Base navbar ── */
        .navbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          height: 56px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--panel);
          border-bottom: 1px solid var(--border);
        }

        /* ── Logo ── */
        .nb-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          flex-shrink: 0;
          margin-right: 8px;
        }
        .nb-logo-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: #1e40af;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .nb-logo-text {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-1);
          line-height: 1;
        }
        .nb-logo-text em {
          font-style: normal;
          color: #3b82f6;
        }

        /* ── Divider ── */
        .nb-sep {
          width: 1px;
          height: 20px;
          background: var(--border);
          flex-shrink: 0;
          margin: 0 16px;
        }

        /* ── Nav links ── */
        .nb-links {
          display: flex;
          align-items: center;
          gap: 2px;
          list-style: none;
          margin: 0; padding: 0;
          flex: 1;
        }
        .nb-links a,
        .nb-links .nb-dropdown-trigger {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-2);
          padding: 6px 10px;
          border-radius: 7px;
          transition: color 0.12s, background 0.12s;
          white-space: nowrap;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          line-height: 1;
        }
        .nb-links a:hover,
        .nb-links .nb-dropdown-trigger:hover { color: var(--text-1); background: var(--bg-3); }
        .nb-links a.active {
          color: var(--text-1);
          background: var(--bg-3);
          font-weight: 600;
        }
        .nb-links .nb-dropdown-trigger.active { color: var(--text-1); font-weight: 600; }

        /* ── Salaries mega-dropdown ── */
        .nb-salaries-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: 280px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          padding: 6px;
          z-index: 200;
          animation: nbMenuIn 0.14s ease;
        }
        @keyframes nbMenuIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nb-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          text-decoration: none;
          transition: background 0.1s;
        }
        .nb-menu-item:hover { background: var(--bg-3); }
        .nb-menu-icon {
          width: 30px; height: 30px;
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .nb-menu-label { font-size: 13px; font-weight: 600; color: var(--text-1); line-height: 1.2; }
        .nb-menu-desc  { font-size: 11px; color: var(--text-3); margin-top: 1px; line-height: 1.3; }
        .nb-menu-divider { height: 1px; background: var(--border); margin: 4px 0; }
        .nb-menu-footer {
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          color: #3b82f6;
          text-decoration: none;
          display: block;
          transition: background 0.1s;
        }
        .nb-menu-footer:hover { background: var(--bg-3); }

        /* ── Right actions ── */
        .nb-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        /* Theme toggle */
        .nb-theme-btn {
          width: 32px; height: 32px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-3);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.12s, color 0.12s;
          flex-shrink: 0;
        }
        .nb-theme-btn:hover { background: var(--bg-3); color: var(--text-1); }

        /* Share salary CTA */
        .nb-cta-share {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 13px; font-weight: 600;
          padding: 6px 13px; border-radius: 7px;
          border: 1.5px solid var(--border);
          color: var(--text-1);
          background: transparent;
          text-decoration: none;
          white-space: nowrap;
          transition: border-color 0.12s, background 0.12s;
        }
        .nb-cta-share:hover { border-color: var(--border-2); background: var(--bg-3); }

        /* Post opportunity CTA */
        .nb-cta-post {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 13px; font-weight: 600;
          padding: 6px 13px; border-radius: 7px;
          border: none;
          color: #fff;
          background: #1e40af;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.12s;
        }
        .nb-cta-post:hover { background: #1e3a8a; }

        /* Auth buttons */
        .nb-btn-ghost {
          font-size: 13px; font-weight: 500;
          padding: 6px 13px; border-radius: 7px;
          border: 1px solid var(--border);
          color: var(--text-2);
          background: transparent;
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
        }
        .nb-btn-ghost:hover { background: var(--bg-3); color: var(--text-1); }
        .nb-btn-signup {
          font-size: 13px; font-weight: 600;
          padding: 6px 14px; border-radius: 7px;
          border: none;
          color: #fff;
          background: #1e40af;
          text-decoration: none;
          transition: background 0.12s;
        }
        .nb-btn-signup:hover { background: #1e3a8a; }

        /* User button */
        .nb-user-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 4px 10px 4px 4px;
          border-radius: 99px;
          border: 1px solid var(--border);
          background: transparent;
          cursor: pointer;
          transition: background 0.12s;
        }
        .nb-user-btn:hover { background: var(--bg-3); }
        .nb-user-avatar {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: rgba(59,130,246,0.14);
          border: 1px solid rgba(59,130,246,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          color: #3b82f6;
          flex-shrink: 0;
        }
        .nb-user-name {
          font-size: 13px; font-weight: 500;
          color: var(--text-1);
          max-width: 100px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .nb-chevron { transition: transform 0.18s; color: var(--text-3); }
        .nb-chevron.open { transform: rotate(180deg); }

        /* User dropdown */
        .nb-user-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 210px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          overflow: hidden;
          z-index: 200;
          animation: nbMenuIn 0.14s ease;
        }
        .nb-user-header {
          padding: 11px 14px 10px;
          border-bottom: 1px solid var(--border);
        }
        .nb-user-header-name { font-size: 13px; font-weight: 600; color: var(--text-1); }
        .nb-user-header-email { font-size: 11px; color: var(--text-3); margin-top: 1px; font-family: 'IBM Plex Mono', monospace; }
        .nb-dropdown-item {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 14px;
          font-size: 13px; font-weight: 500;
          color: var(--text-2);
          text-decoration: none;
          background: transparent; border: none;
          width: 100%; text-align: left;
          cursor: pointer; font-family: inherit;
          transition: background 0.1s, color 0.1s;
        }
        .nb-dropdown-item:hover { background: var(--bg-3); color: var(--text-1); }
        .nb-dropdown-item.danger { color: var(--rose); }
        .nb-dropdown-item.danger:hover { background: var(--rose-dim); }
        .nb-dropdown-divider { height: 1px; background: var(--border); }

        /* ── Mobile ── */
        .nb-hamburger {
          display: none;
          width: 34px; height: 34px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-2);
          align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.12s;
        }
        .nb-hamburger:hover { background: var(--bg-3); }
        .nb-mobile-user { display: none; }

        .nb-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 150;
          opacity: 0; transition: opacity 0.25s;
          pointer-events: none;
        }
        .nb-overlay.open { opacity: 1; pointer-events: all; }

        .nb-drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 280px;
          background: var(--panel);
          border-left: 1px solid var(--border);
          z-index: 160;
          display: flex; flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
          overflow-y: auto;
        }
        .nb-drawer.open { transform: translateX(0); }

        .nb-drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px;
          height: 56px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .nb-drawer-close {
          width: 30px; height: 30px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-2);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 14px;
          transition: background 0.12s;
        }
        .nb-drawer-close:hover { background: var(--bg-3); }

        .nb-drawer-links {
          list-style: none; margin: 0;
          padding: 10px 10px 0;
        }
        .nb-drawer-links li a {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 14px; font-weight: 500;
          color: var(--text-2);
          text-decoration: none;
          transition: background 0.1s, color 0.1s;
        }
        .nb-drawer-links li a:hover { background: var(--bg-3); color: var(--text-1); }
        .nb-drawer-links li a.active { background: var(--bg-3); color: var(--text-1); font-weight: 600; }
        .nb-drawer-links li a .nb-link-icon {
          width: 28px; height: 28px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-3); flex-shrink: 0;
        }
        .nb-drawer-section-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.07em;
          text-transform: uppercase; color: var(--text-3);
          padding: 10px 12px 4px;
        }
        .nb-drawer-divider { height: 1px; background: var(--border); margin: 8px 10px; }

        .nb-drawer-actions {
          padding: 12px 10px 20px;
          display: flex; flex-direction: column; gap: 8px;
          margin-top: auto;
          border-top: 1px solid var(--border);
        }
        .nb-drawer-cta {
          display: flex; align-items: center; justify-content: center;
          padding: 10px 16px; border-radius: 8px;
          font-size: 14px; font-weight: 600;
          text-decoration: none; text-align: center;
          transition: background 0.12s;
        }

        @media (max-width: 768px) {
          .nb-links        { display: none !important; }
          .nb-sep          { display: none !important; }
          .nb-hamburger    { display: flex !important; }
          .nb-overlay      { display: block; }
          .nb-desktop-only { display: none !important; }
          .nb-mobile-user  { display: flex !important; }
          .nb-theme-btn    { display: none !important; }
          .navbar          { padding: 0 14px; }
        }
      `}</style>

      {/* ── Logo ── */}
      <Link to="/" className="nb-logo">
        <div className="nb-logo-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <span className="nb-logo-text">Salary<em>Insights</em></span>
      </Link>

      <div className="nb-sep" />

      {/* ── Nav links ── */}
      <ul className="nb-links">
        <li><Link to="/" className={isActive('/')}>Home</Link></li>

        {/* Salaries dropdown */}
        <li ref={salariesRef} style={{ position: 'relative' }}
          onMouseEnter={() => setSalariesOpen(true)}
          onMouseLeave={() => setSalariesOpen(false)}
        >
          <button
            className={`nb-dropdown-trigger${salariesActive ? ' active' : ''}`}
            onClick={() => setSalariesOpen(o => !o)}
          >
            Salaries
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transition: 'transform 0.18s', transform: salariesOpen ? 'rotate(180deg)' : 'none', opacity: 0.5 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {salariesOpen && (
            <div className="nb-salaries-menu">
              <Link to="/salaries" className="nb-menu-item">
                <div className="nb-menu-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
                  </svg>
                </div>
                <div>
                  <div className="nb-menu-label">Salary database</div>
                  <div className="nb-menu-desc">Browse real salaries by role & company</div>
                </div>
              </Link>
              <Link to="/salaries?tab=levels" className="nb-menu-item">
                <div className="nb-menu-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <div>
                  <div className="nb-menu-label">Level guide</div>
                  <div className="nb-menu-desc">Understand career levels across companies</div>
                </div>
              </Link>
              <Link to="/salaries?tab=benchmark" className="nb-menu-item">
                <div className="nb-menu-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div>
                  <div className="nb-menu-label">Benchmark my offer</div>
                  <div className="nb-menu-desc">See how your offer stacks up</div>
                </div>
              </Link>
              <div className="nb-menu-divider"/>
              <Link to="/submit" className="nb-menu-footer">₹ Share your salary → help the community</Link>
            </div>
          )}
        </li>

        <li><Link to="/companies"     className={isActive('/companies')}>Companies</Link></li>
        <li><Link to="/dashboard"     className={isActive('/dashboard')}>Analytics</Link></li>
        <li><Link to="/opportunities" className={isActive('/opportunities')}>Opportunities</Link></li>
        {user?.role === 'ADMIN' && (
          <li><Link to="/admin" className={isActive('/admin')}>Admin</Link></li>
        )}
      </ul>

      {/* ── Actions ── */}
      <div className="nb-actions">
        <button className="nb-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {user ? (
          <div className="nb-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link to="/submit" className="nb-cta-share">
              <span style={{ fontSize: 13 }}>₹</span> Share Salary
            </Link>
            <Link to="/opportunities/post" className="nb-cta-post">
              <span style={{ fontSize: 15, fontWeight: 400, lineHeight: 1 }}>+</span> Post Role
            </Link>

            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button className="nb-user-btn" onClick={() => setDropdownOpen(o => !o)}>
                <div className="nb-user-avatar">{userInitial}</div>
                <span className="nb-user-name">{displayName}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className={`nb-chevron${dropdownOpen ? ' open' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {dropdownOpen && (
                <div className="nb-user-menu">
                  <div className="nb-user-header">
                    <div className="nb-user-header-name">{displayName}</div>
                    <div className="nb-user-header-email">{user.email}</div>
                  </div>
                  <Link to="/my-submissions" className="nb-dropdown-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    My Submissions
                  </Link>
                  <Link to="/opportunities/post" className="nb-dropdown-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    Post Opportunity
                  </Link>
                  <div className="nb-dropdown-divider"/>
                  <button className="nb-dropdown-item danger" onClick={handleLogout}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="nb-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link to="/login"    className="nb-btn-ghost">Sign in</Link>
            <Link to="/register" className="nb-btn-signup">Sign up</Link>
          </div>
        )}

        {/* Mobile: avatar tap opens drawer */}
        {user && (
          <div className="nb-mobile-user" onClick={() => setMobileOpen(o => !o)}
            style={{ alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <div className="nb-user-avatar">{userInitial}</div>
          </div>
        )}

        {/* Hamburger */}
        <button className="nb-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Open menu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── Mobile overlay ── */}
      <div className={`nb-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* ── Mobile drawer ── */}
      <div className={`nb-drawer${mobileOpen ? ' open' : ''}`}>
        <div className="nb-drawer-header">
          <Link to="/" className="nb-logo" onClick={() => setMobileOpen(false)}>
            <div className="nb-logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <span className="nb-logo-text">Salary<em>Insights</em></span>
          </Link>
          <button className="nb-drawer-close" onClick={() => setMobileOpen(false)}>✕</button>
        </div>

        <ul className="nb-drawer-links">
          <li><Link to="/" className={isActive('/')}>
            <span className="nb-link-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            </span>Home
          </Link></li>
        </ul>

        <div className="nb-drawer-section-label">Salaries</div>
        <ul className="nb-drawer-links" style={{ paddingTop: 0 }}>
          <li><Link to="/salaries" className={isActive('/salaries')}>
            <span className="nb-link-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </span>Salary database
          </Link></li>
          <li><Link to="/salaries?tab=levels" className={location.search.includes('tab=levels') ? 'active' : ''}>
            <span className="nb-link-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </span>Level guide
          </Link></li>
          <li><Link to="/salaries?tab=benchmark" className={location.search.includes('tab=benchmark') ? 'active' : ''}>
            <span className="nb-link-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </span>Benchmark my offer
          </Link></li>
        </ul>

        <div className="nb-drawer-divider"/>
        <ul className="nb-drawer-links" style={{ paddingTop: 0 }}>
          <li><Link to="/companies" className={isActive('/companies')}>
            <span className="nb-link-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></span>
            Companies
          </Link></li>
          <li><Link to="/dashboard" className={isActive('/dashboard')}>
            <span className="nb-link-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></span>
            Analytics
          </Link></li>
          <li><Link to="/opportunities" className={isActive('/opportunities')}>
            <span className="nb-link-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            Opportunities
          </Link></li>
          {user?.role === 'ADMIN' && (
            <li><Link to="/admin" className={isActive('/admin')}>
              <span className="nb-link-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg></span>
              Admin
            </Link></li>
          )}
        </ul>

        <div className="nb-drawer-actions">
          {user ? (
            <>
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px 10px' }}>
                  <div className="nb-user-avatar">{userInitial}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>{user.email}</div>
                  </div>
                </div>
              )}
              <Link to="/submit" className="nb-drawer-cta"
                style={{ border: '1.5px solid var(--border)', color: 'var(--text-1)', background: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                ₹ Share Salary
              </Link>
              <Link to="/opportunities/post" className="nb-drawer-cta" style={{ background: '#1e40af', color: '#fff' }}>
                + Post Opportunity
              </Link>
              <Link to="/my-submissions" className="nb-drawer-cta"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'transparent', fontSize: 13 }}>
                My Submissions
              </Link>
              <button onClick={handleLogout} className="nb-drawer-cta"
                style={{ border: '1px solid var(--border)', color: 'var(--rose)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="nb-drawer-cta" style={{ border: '1px solid var(--border)', color: 'var(--text-1)', background: 'transparent' }}>Sign in</Link>
              <Link to="/register" className="nb-drawer-cta" style={{ background: '#1e40af', color: '#fff' }}>Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

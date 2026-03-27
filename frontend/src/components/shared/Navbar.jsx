import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar() {
  const location         = useLocation();
  const navigate         = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const [theme, setTheme]               = useState(() => localStorage.getItem('theme') || 'light');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [salariesOpen, setSalariesOpen] = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [scrolled, setScrolled]         = useState(false);

  const dropdownRef = useRef(null);
  const salariesRef = useRef(null);

  /* ── theme ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  /* ── scroll shadow ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── click outside ── */
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (salariesRef.current && !salariesRef.current.contains(e.target)) setSalariesOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── route change ── */
  useEffect(() => {
    setDropdownOpen(false);
    setSalariesOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  /* ── mobile scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleTheme    = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const isActive       = (path) => location.pathname === path;
  const salariesActive = ['/salaries', '/level-guide', '/benchmark'].includes(location.pathname);

  const displayName = user
    ? (user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : user.email)
    : null;
  const firstName   = user?.firstName || displayName?.split(' ')[0] || 'Account';
  const userInitial = (user?.firstName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase();

  function handleLogout() {
    setDropdownOpen(false);
    setMobileOpen(false);
    logout();
    navigate('/');
  }

  return (
    <div className="nb-shell">
      <style>{`
        /* ─────────────────────────────────────────
           SHELL
        ───────────────────────────────────────── */
        .nb-shell {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          display: flex;
          justify-content: center;
          padding: 10px 16px 0;
          pointer-events: none;
        }

        /* ─────────────────────────────────────────
           PILL
        ───────────────────────────────────────── */
        .nb-pill {
          pointer-events: all;
          width: 100%;
          max-width: 1120px;
          height: 52px;
          display: flex;
          align-items: center;
          background: var(--panel);
          border: 0.5px solid var(--border);
          border-radius: 999px;
          padding: 0 6px 0 18px;
          transition: box-shadow 0.25s, border-color 0.25s;
          position: relative;
        }
        .nb-pill.scrolled {
          box-shadow: 0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05);
          border-color: var(--border-2);
        }
        [data-theme='light'] .nb-pill {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(255,255,255,0.92);
        }
        [data-theme='dark'] .nb-pill {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(30,41,59,0.92);
        }

        /* ─────────────────────────────────────────
           LOGO
        ───────────────────────────────────────── */
        .nb-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          flex-shrink: 0;
          margin-right: 2px;
        }
        .nb-logo-icon {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: #1e40af;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .nb-logo-text {
          font-size: 14.5px;
          font-weight: 700;
          letter-spacing: -0.035em;
          color: var(--text-1);
          line-height: 1;
        }
        .nb-logo-text em {
          font-style: normal;
          color: #3b82f6;
        }

        /* ─────────────────────────────────────────
           DIVIDER
        ───────────────────────────────────────── */
        .nb-sep {
          width: 1px; height: 18px;
          background: var(--border);
          flex-shrink: 0;
          margin: 0 14px;
        }

        /* ─────────────────────────────────────────
           NAV LINKS
        ───────────────────────────────────────── */
        .nb-links {
          display: flex;
          align-items: center;
          gap: 1px;
          list-style: none;
          margin: 0; padding: 0;
          flex: 1;
        }
        .nb-link,
        .nb-dropdown-trigger {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-2);
          padding: 6px 12px;
          border-radius: 999px;
          text-decoration: none;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          line-height: 1;
          white-space: nowrap;
          transition: color 0.14s, background 0.14s;
        }
        .nb-link:hover,
        .nb-dropdown-trigger:hover {
          color: var(--text-1);
          background: var(--bg-3);
        }
        .nb-link.active {
          background: #1e40af;
          color: #fff;
          font-weight: 600;
        }
        .nb-dropdown-trigger.active {
          background: #1e40af;
          color: #fff;
          font-weight: 600;
        }
        .nb-chevron {
          transition: transform 0.18s;
          opacity: 0.55;
        }
        .nb-chevron.open { transform: rotate(180deg); }
        .nb-link.active .nb-chevron,
        .nb-dropdown-trigger.active .nb-chevron { opacity: 0.8; }

        /* ─────────────────────────────────────────
           SALARIES DROPDOWN
        ───────────────────────────────────────── */
        .nb-salaries-menu {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          width: 292px;
          background: var(--panel);
          border: 0.5px solid var(--border-2);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          padding: 6px;
          z-index: 200;
          animation: nbDropIn 0.15s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes nbDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nb-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.1s;
        }
        .nb-menu-item:hover { background: var(--bg-3); }
        .nb-menu-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .nb-menu-label { font-size: 13px; font-weight: 600; color: var(--text-1); line-height: 1.25; }
        .nb-menu-desc  { font-size: 11.5px; color: var(--text-3); margin-top: 1px; line-height: 1.35; }
        .nb-menu-divider { height: 1px; background: var(--border); margin: 4px 0; }
        .nb-menu-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
          color: #16a34a;
          text-decoration: none;
          transition: background 0.1s;
        }
        .nb-menu-footer:hover { background: rgba(22,163,74,0.07); }

        /* ─────────────────────────────────────────
           RIGHT ACTIONS
        ───────────────────────────────────────── */
        .nb-actions {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
          margin-left: 6px;
        }

        /* Theme toggle */
        .nb-theme-btn {
          width: 32px; height: 32px;
          border-radius: 50%;
          border: 0.5px solid var(--border);
          background: transparent;
          color: var(--text-3);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.14s, color 0.14s, border-color 0.14s;
          flex-shrink: 0;
        }
        .nb-theme-btn:hover {
          background: var(--bg-3);
          color: var(--text-1);
          border-color: var(--border-2);
        }

        /* Share salary – green tint */
        .nb-cta-share {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 13px; font-weight: 600;
          padding: 7px 14px;
          border-radius: 999px;
          border: 0.5px solid rgba(22,163,74,0.35);
          color: #15803d;
          background: rgba(22,163,74,0.07);
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          transition: border-color 0.14s, background 0.14s;
        }
        .nb-cta-share:hover {
          border-color: rgba(22,163,74,0.55);
          background: rgba(22,163,74,0.12);
        }
        [data-theme='dark'] .nb-cta-share {
          color: #4ade80;
          border-color: rgba(74,222,128,0.25);
          background: rgba(74,222,128,0.08);
        }
        [data-theme='dark'] .nb-cta-share:hover {
          border-color: rgba(74,222,128,0.4);
          background: rgba(74,222,128,0.14);
        }

        /* Post role CTA */
        .nb-cta-post {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 13px; font-weight: 700;
          padding: 7px 16px;
          border-radius: 999px;
          border: none;
          color: #fff;
          background: #1e40af;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.14s, box-shadow 0.14s;
        }
        .nb-cta-post:hover {
          background: #1d3a9e;
          box-shadow: 0 2px 10px rgba(30,64,175,0.35);
        }

        /* Auth buttons */
        .nb-btn-ghost {
          font-size: 13px; font-weight: 500;
          padding: 7px 14px; border-radius: 999px;
          border: 0.5px solid var(--border);
          color: var(--text-2);
          background: transparent;
          text-decoration: none;
          transition: background 0.14s, color 0.14s;
        }
        .nb-btn-ghost:hover { background: var(--bg-3); color: var(--text-1); }
        .nb-btn-signup {
          font-size: 13px; font-weight: 700;
          padding: 7px 16px; border-radius: 999px;
          border: none; color: #fff; background: #1e40af;
          text-decoration: none;
          transition: background 0.14s;
        }
        .nb-btn-signup:hover { background: #1d3a9e; }

        /* User button */
        .nb-user-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 10px 4px 4px;
          border-radius: 999px;
          border: 0.5px solid var(--border);
          background: transparent;
          cursor: pointer;
          transition: background 0.14s, border-color 0.14s;
          flex-shrink: 0;
        }
        .nb-user-btn:hover { background: var(--bg-3); border-color: var(--border-2); }
        .nb-user-avatar {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: rgba(59,130,246,0.12);
          border: 1.5px solid rgba(59,130,246,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          color: #3b82f6;
          flex-shrink: 0;
        }
        .nb-user-name {
          font-size: 13px; font-weight: 500;
          color: var(--text-1);
          max-width: 90px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .nb-user-chevron { transition: transform 0.18s; color: var(--text-3); }
        .nb-user-chevron.open { transform: rotate(180deg); }

        /* User dropdown */
        .nb-user-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 220px;
          background: var(--panel);
          border: 0.5px solid var(--border-2);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          overflow: hidden;
          z-index: 200;
          animation: nbDropIn 0.15s cubic-bezier(0.16,1,0.3,1);
        }
        .nb-user-header {
          padding: 12px 14px 11px;
          border-bottom: 0.5px solid var(--border);
        }
        .nb-user-header-name  { font-size: 13px; font-weight: 600; color: var(--text-1); }
        .nb-user-header-email { font-size: 11px; color: var(--text-3); margin-top: 2px; font-family: 'IBM Plex Mono', monospace; }
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

        /* ─────────────────────────────────────────
           MOBILE
        ───────────────────────────────────────── */
        .nb-hamburger {
          display: none;
          width: 34px; height: 34px;
          border-radius: 50%;
          border: 0.5px solid var(--border);
          background: transparent;
          color: var(--text-2);
          align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.14s;
        }
        .nb-hamburger:hover { background: var(--bg-3); }

        .nb-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 150;
          opacity: 0; transition: opacity 0.25s;
          pointer-events: none;
        }
        .nb-overlay.open { opacity: 1; pointer-events: all; }

        .nb-drawer {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          width: 290px;
          background: var(--panel);
          border-left: 0.5px solid var(--border);
          z-index: 160;
          display: flex; flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          overflow-y: auto;
        }
        .nb-drawer.open { transform: translateX(0); }

        .nb-drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px;
          height: 60px;
          border-bottom: 0.5px solid var(--border);
          flex-shrink: 0;
        }
        .nb-drawer-close {
          width: 30px; height: 30px;
          border-radius: 50%;
          border: 0.5px solid var(--border);
          background: transparent;
          color: var(--text-2);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.14s;
        }
        .nb-drawer-close:hover { background: var(--bg-3); }

        .nb-drawer-section {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--text-3);
          padding: 14px 16px 5px;
        }
        .nb-drawer-divider { height: 1px; background: var(--border); margin: 8px 12px; }

        .nb-drawer-links { list-style: none; margin: 0; padding: 6px 8px 0; }
        .nb-drawer-links li a,
        .nb-drawer-links li button {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 10px;
          font-size: 13.5px; font-weight: 500;
          color: var(--text-2); text-decoration: none;
          background: transparent; border: none; width: 100%;
          text-align: left; cursor: pointer; font-family: inherit;
          transition: background 0.1s, color 0.1s;
        }
        .nb-drawer-links li a:hover,
        .nb-drawer-links li button:hover { background: var(--bg-3); color: var(--text-1); }
        .nb-drawer-links li a.active { background: var(--bg-3); color: var(--text-1); font-weight: 600; }
        .nb-drawer-icon {
          width: 28px; height: 28px; border-radius: 7px;
          background: var(--bg-3);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .nb-drawer-footer {
          padding: 12px 12px 24px;
          margin-top: auto;
          border-top: 0.5px solid var(--border);
          display: flex; flex-direction: column; gap: 8px;
        }
        .nb-drawer-cta {
          display: flex; align-items: center; justify-content: center;
          padding: 10px 16px; border-radius: 999px;
          font-size: 13.5px; font-weight: 600;
          text-decoration: none; text-align: center; gap: 7px;
          transition: background 0.14s, border-color 0.14s;
        }

        @media (max-width: 900px) {
          .nb-links        { display: none !important; }
          .nb-sep          { display: none !important; }
          .nb-hamburger    { display: flex !important; }
          .nb-overlay      { display: block; }
          .nb-desktop-only { display: none !important; }
          .nb-pill         { padding: 0 10px 0 14px; }
        }
        @media (max-width: 560px) {
          .nb-shell { padding: 8px 10px 0; }
        }
      `}</style>

      <nav className={`nb-pill${scrolled ? ' scrolled' : ''}`}>

        {/* ── Logo ── */}
        <Link to="/" className="nb-logo">
          <div className="nb-logo-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6"  y1="20" x2="6"  y2="14"/>
            </svg>
          </div>
          <span className="nb-logo-text">Salary<em>Insights</em></span>
        </Link>

        <div className="nb-sep" />

        {/* ── Nav links ── */}
        <ul className="nb-links">
          <li>
            <Link to="/" className={`nb-link${isActive('/') ? ' active' : ''}`}>Home</Link>
          </li>

          <li ref={salariesRef} style={{ position: 'relative' }}
            onMouseEnter={() => setSalariesOpen(true)}
            onMouseLeave={() => setSalariesOpen(false)}
          >
            <button
              className={`nb-dropdown-trigger${salariesActive ? ' active' : ''}`}
              onClick={() => setSalariesOpen(o => !o)}
            >
              Salaries
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`nb-chevron${salariesOpen ? ' open' : ''}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {salariesOpen && (
              <div className="nb-salaries-menu">
                <Link to="/salaries" className="nb-menu-item">
                  <div className="nb-menu-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="8" y1="13" x2="16" y2="13"/>
                      <line x1="8" y1="17" x2="13" y2="17"/>
                    </svg>
                  </div>
                  <div>
                    <div className="nb-menu-label">Salary database</div>
                    <div className="nb-menu-desc">Browse real salaries by role & company</div>
                  </div>
                </Link>
                <Link to="/salaries?tab=levels" className="nb-menu-item">
                  <div className="nb-menu-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2">
                      <rect x="3"  y="3"  width="7" height="7"/>
                      <rect x="14" y="3"  width="7" height="7"/>
                      <rect x="14" y="14" width="7" height="7"/>
                      <rect x="3"  y="14" width="7" height="7"/>
                    </svg>
                  </div>
                  <div>
                    <div className="nb-menu-label">Level guide</div>
                    <div className="nb-menu-desc">Understand career levels across companies</div>
                  </div>
                </Link>
                <Link to="/salaries?tab=benchmark" className="nb-menu-item">
                  <div className="nb-menu-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6"  y1="20" x2="6"  y2="14"/>
                    </svg>
                  </div>
                  <div>
                    <div className="nb-menu-label">Benchmark my offer</div>
                    <div className="nb-menu-desc">See how your offer stacks up</div>
                  </div>
                </Link>
                <div className="nb-menu-divider"/>
                <Link to="/submit" className="nb-menu-footer">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 12 20 22 4 22 4 12"/>
                    <polyline points="22 7 12 2 2 7"/>
                    <line x1="12" y1="2" x2="12" y2="22"/>
                  </svg>
                  Share your salary — help the community
                </Link>
              </div>
            )}
          </li>

          <li><Link to="/companies"     className={`nb-link${isActive('/companies')     ? ' active' : ''}`}>Companies</Link></li>
          <li><Link to="/dashboard"     className={`nb-link${isActive('/dashboard')     ? ' active' : ''}`}>Analytics</Link></li>
          <li><Link to="/opportunities" className={`nb-link${isActive('/opportunities') ? ' active' : ''}`}>Opportunities</Link></li>
          {user?.role === 'ADMIN' && (
            <li><Link to="/admin" className={`nb-link${isActive('/admin') ? ' active' : ''}`}>Admin</Link></li>
          )}
        </ul>

        {/* ── Right actions ── */}
        <div className="nb-actions">

          <button className="nb-theme-btn nb-desktop-only" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1"    x2="12" y2="3"/>
                <line x1="12" y1="21"   x2="12" y2="23"/>
                <line x1="4.22" y1="4.22"   x2="5.64"  y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12"    x2="3"  y2="12"/>
                <line x1="21" y1="12"   x2="23" y2="12"/>
                <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
                <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {user ? (
            <div className="nb-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Link to="/submit" className="nb-cta-share">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 12 20 22 4 22 4 12"/>
                  <polyline points="22 7 12 2 2 7"/>
                  <line x1="12" y1="2" x2="12" y2="22"/>
                </svg>
                Share Salary
              </Link>
              <Link to="/opportunities/post" className="nb-cta-post">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5"  y1="12" x2="19" y2="12"/>
                </svg>
                Post Role
              </Link>

              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button className="nb-user-btn" onClick={() => setDropdownOpen(o => !o)}>
                  <div className="nb-user-avatar">{userInitial}</div>
                  <span className="nb-user-name">{firstName}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`nb-user-chevron${dropdownOpen ? ' open' : ''}`}>
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      My Submissions
                    </Link>
                    <Link to="/opportunities/post" className="nb-dropdown-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8"  x2="12" y2="16"/>
                        <line x1="8"  y1="12" x2="16" y2="12"/>
                      </svg>
                      Post Opportunity
                    </Link>
                    <div className="nb-dropdown-divider"/>
                    <button className="nb-dropdown-item danger" onClick={handleLogout}>
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
            </div>
          ) : (
            <div className="nb-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Link to="/login"    className="nb-btn-ghost">Sign in</Link>
              <Link to="/register" className="nb-btn-signup">Sign up</Link>
            </div>
          )}

          {/* Hamburger */}
          <button className="nb-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Open menu">
            {mobileOpen ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* ── Mobile overlay ── */}
      <div className={`nb-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* ── Mobile drawer ── */}
      <div className={`nb-drawer${mobileOpen ? ' open' : ''}`}>
        <div className="nb-drawer-header">
          <Link to="/" className="nb-logo" onClick={() => setMobileOpen(false)}>
            <div className="nb-logo-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6"  y1="20" x2="6"  y2="14"/>
              </svg>
            </div>
            <span className="nb-logo-text">Salary<em>Insights</em></span>
          </Link>
          <button className="nb-drawer-close" onClick={() => setMobileOpen(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px' }}>
            <div className="nb-user-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{userInitial}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono', monospace" }}>{user.email}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 10px' }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
          <button className="nb-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>

        <div className="nb-drawer-divider"/>

        <div className="nb-drawer-section">Navigate</div>
        <ul className="nb-drawer-links">
          <li><Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setMobileOpen(false)}>
            <span className="nb-drawer-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span>
            Home
          </Link></li>
          <li><Link to="/companies" className={isActive('/companies') ? 'active' : ''} onClick={() => setMobileOpen(false)}>
            <span className="nb-drawer-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></span>
            Companies
          </Link></li>
          <li><Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''} onClick={() => setMobileOpen(false)}>
            <span className="nb-drawer-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></span>
            Analytics
          </Link></li>
          <li><Link to="/opportunities" className={isActive('/opportunities') ? 'active' : ''} onClick={() => setMobileOpen(false)}>
            <span className="nb-drawer-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
            Opportunities
          </Link></li>
        </ul>

        <div className="nb-drawer-section">Salaries</div>
        <ul className="nb-drawer-links">
          <li><Link to="/salaries" className={isActive('/salaries') ? 'active' : ''} onClick={() => setMobileOpen(false)}>
            <span className="nb-drawer-icon" style={{ background: 'rgba(59,130,246,0.1)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
            Salary database
          </Link></li>
          <li><Link to="/salaries?tab=levels" onClick={() => setMobileOpen(false)}>
            <span className="nb-drawer-icon" style={{ background: 'rgba(139,92,246,0.1)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span>
            Level guide
          </Link></li>
          <li><Link to="/salaries?tab=benchmark" onClick={() => setMobileOpen(false)}>
            <span className="nb-drawer-icon" style={{ background: 'rgba(16,185,129,0.1)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></span>
            Benchmark offer
          </Link></li>
        </ul>

        {user && (
          <>
            <div className="nb-drawer-divider"/>
            <ul className="nb-drawer-links">
              <li><Link to="/my-submissions" onClick={() => setMobileOpen(false)}>
                <span className="nb-drawer-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                My Submissions
              </Link></li>
              {user?.role === 'ADMIN' && (
                <li><Link to="/admin" className={isActive('/admin') ? 'active' : ''} onClick={() => setMobileOpen(false)}>
                  <span className="nb-drawer-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg></span>
                  Admin
                </Link></li>
              )}
            </ul>
          </>
        )}

        <div className="nb-drawer-footer">
          {user ? (
            <>
              <Link to="/submit" className="nb-drawer-cta" onClick={() => setMobileOpen(false)}
                style={{ border: '0.5px solid rgba(22,163,74,0.35)', color: '#15803d', background: 'rgba(22,163,74,0.07)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 12 20 22 4 22 4 12"/><polyline points="22 7 12 2 2 7"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
                Share Salary
              </Link>
              <Link to="/opportunities/post" className="nb-drawer-cta" onClick={() => setMobileOpen(false)}
                style={{ background: '#1e40af', color: '#fff' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Post Role
              </Link>
              <button onClick={handleLogout} className="nb-drawer-cta"
                style={{ border: '0.5px solid var(--border)', color: 'var(--rose)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="nb-drawer-cta" onClick={() => setMobileOpen(false)} style={{ border: '0.5px solid var(--border)', color: 'var(--text-1)', background: 'transparent' }}>Sign in</Link>
              <Link to="/register" className="nb-drawer-cta" onClick={() => setMobileOpen(false)} style={{ background: '#1e40af', color: '#fff' }}>Sign up</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

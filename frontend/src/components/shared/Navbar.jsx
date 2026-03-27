import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';

/* ── SVG icon helpers ─────────────────────────────────────────── */
const Icon = {
  logo:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  home:        (c='currentColor') => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  salaries:    (c='currentColor') => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2m-3-7h6m-6 0a3 3 0 0 1 3-3 3 3 0 0 1 3 3"/></svg>,
  companies:   (c='currentColor') => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  analytics:   (c='currentColor') => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  opps:        (c='currentColor') => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  admin:       (c='currentColor') => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  db:          () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  levels:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M3 21h18"/><path d="M3 12h6M3 7h11"/></svg>,
  benchmark:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  share:       () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><polyline points="22 7 12 2 2 7"/><line x1="12" y1="2" x2="12" y2="22"/></svg>,
  plus:        () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chevronDown: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  sun:         () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:        () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  logout:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  myDocs:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  postOpp:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  close:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  menu:        () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
};

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (salariesRef.current && !salariesRef.current.contains(e.target)) setSalariesOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setDropdownOpen(false); setSalariesOpen(false); setMobileOpen(false);
  }, [location.pathname, location.search]);

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
    setDropdownOpen(false); setMobileOpen(false);
    logout(); navigate('/');
  }

  const navItems = [
    { to: '/',              label: 'Home',          icon: Icon.home },
    { to: '/companies',     label: 'Companies',     icon: Icon.companies },
    { to: '/dashboard',     label: 'Analytics',     icon: Icon.analytics },
    { to: '/opportunities', label: 'Opportunities', icon: Icon.opps },
  ];

  const salariesItems = [
    { to: '/salaries',               label: 'Salary Database',  desc: 'Browse real salaries by role & company', icon: Icon.db,        iconBg: 'rgba(59,130,246,0.1)' },
    { to: '/salaries?tab=levels',    label: 'Level Guide',      desc: 'Career levels mapped across companies',  icon: Icon.levels,    iconBg: 'rgba(139,92,246,0.1)' },
    { to: '/salaries?tab=benchmark', label: 'Benchmark Offer',  desc: 'See how your offer stacks up',           icon: Icon.benchmark, iconBg: 'rgba(16,185,129,0.1)'  },
  ];

  return (
    <div className="nb-shell">
      <style>{`
        /* ── SHELL ───────────────────────────────── */
        .nb-shell {
          position: fixed; top: 0; left: 0; right: 0;
          z-index: 100;
        }

        /* ── FULL-WIDTH BAR ──────────────────────── */
        .nb-pill {
          width: 100%; height: 56px;
          display: flex; align-items: center;
          background: var(--panel);
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          gap: 0;
          transition: box-shadow 0.25s, border-color 0.25s;
          position: relative;
        }
        .nb-pill.scrolled {
          box-shadow: 0 2px 16px rgba(0,0,0,0.08);
          border-color: var(--border-2);
        }
        [data-theme='light'] .nb-pill {
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          background: rgba(255,255,255,0.96);
        }
        [data-theme='dark'] .nb-pill {
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          background: rgba(15,23,42,0.96);
        }

        /* ── LOGO ────────────────────────────────── */
        .nb-logo {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; flex-shrink: 0;
        }
        .nb-logo-icon {
          width: 30px; height: 30px; border-radius: 9px;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(59,130,246,0.35);
        }
        .nb-logo-text {
          font-size: 14.5px; font-weight: 700;
          letter-spacing: -0.04em; color: var(--text-1); line-height: 1;
        }
        .nb-logo-text em { font-style: normal; color: #3b82f6; }

        /* ── DIVIDER ─────────────────────────────── */
        .nb-sep {
          width: 1px; height: 20px; background: var(--border);
          flex-shrink: 0; margin: 0 20px;
        }

        /* ── NAV LINKS — centered ─────────────────── */
        .nb-links {
          display: flex; align-items: center; gap: 1px;
          list-style: none; margin: 0; padding: 0;
          position: absolute; left: 50%; transform: translateX(-50%);
        }
        .nb-link, .nb-dropdown-trigger {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 500;
          color: var(--text-2);
          padding: 6px 10px;
          border-radius: 8px;
          text-decoration: none;
          background: transparent; border: none;
          cursor: pointer; font-family: inherit;
          line-height: 1; white-space: nowrap;
          transition: color 0.14s, background 0.14s;
        }
        .nb-link .nb-nav-icon, .nb-dropdown-trigger .nb-nav-icon {
          opacity: 0.5; transition: opacity 0.14s;
          display: flex; align-items: center;
        }
        .nb-link:hover, .nb-dropdown-trigger:hover {
          color: var(--text-1); background: var(--bg-3);
        }
        .nb-link:hover .nb-nav-icon, .nb-dropdown-trigger:hover .nb-nav-icon { opacity: 0.9; }
        .nb-link.active {
          background: rgba(59,130,246,0.1);
          color: #2563eb; font-weight: 600;
        }
        .nb-link.active .nb-nav-icon { opacity: 1; }
        .nb-dropdown-trigger.active {
          background: rgba(59,130,246,0.1);
          color: #2563eb; font-weight: 600;
        }
        .nb-dropdown-trigger.active .nb-nav-icon { opacity: 1; }
        .nb-chevron { transition: transform 0.18s; opacity: 0.4; display: inline-flex; align-items: center; }
        .nb-chevron.open { transform: rotate(180deg); }

        /* ── SALARIES DROPDOWN ───────────────────── */
        .nb-salaries-menu {
          position: absolute; top: calc(100% + 10px); left: 50%; transform: translateX(-50%);
          width: 300px;
          background: var(--panel);
          border: 1px solid var(--border-2);
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06);
          padding: 6px; z-index: 200;
          animation: nbDropIn 0.15s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes nbDropIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
        }
        .nb-menu-item {
          display: flex; align-items: center; gap: 11px;
          padding: 9px 10px; border-radius: 10px;
          text-decoration: none; transition: background 0.1s;
        }
        .nb-menu-item:hover { background: var(--bg-3); }
        .nb-menu-icon {
          width: 34px; height: 34px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .nb-menu-label { font-size: 13px; font-weight: 600; color: var(--text-1); line-height: 1.25; }
        .nb-menu-desc  { font-size: 11.5px; color: var(--text-3); margin-top: 2px; line-height: 1.35; }
        .nb-menu-divider { height: 1px; background: var(--border); margin: 4px 0; }
        .nb-menu-footer {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 10px; border-radius: 10px;
          font-size: 12.5px; font-weight: 600; color: #16a34a;
          text-decoration: none; transition: background 0.1s;
        }
        .nb-menu-footer:hover { background: rgba(22,163,74,0.07); }

        /* ── RIGHT ACTIONS ───────────────────────── */
        .nb-actions {
          display: flex; align-items: center; gap: 6px;
          flex-shrink: 0; margin-left: auto;
        }
        .nb-theme-btn {
          width: 34px; height: 34px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text-3);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.14s, color 0.14s, border-color 0.14s;
          flex-shrink: 0;
        }
        .nb-theme-btn:hover { background: var(--bg-3); color: var(--text-1); border-color: var(--border-2); }

        /* Share salary */
        .nb-cta-share {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600;
          padding: 7px 14px; border-radius: 8px;
          border: 1px solid rgba(22,163,74,0.35); color: #15803d;
          background: rgba(22,163,74,0.07);
          text-decoration: none; white-space: nowrap; flex-shrink: 0;
          transition: border-color 0.14s, background 0.14s;
        }
        .nb-cta-share:hover { border-color: rgba(22,163,74,0.55); background: rgba(22,163,74,0.12); }
        [data-theme='dark'] .nb-cta-share { color: #4ade80; border-color: rgba(74,222,128,0.25); background: rgba(74,222,128,0.08); }
        [data-theme='dark'] .nb-cta-share:hover { border-color: rgba(74,222,128,0.4); background: rgba(74,222,128,0.14); }

        /* Post role */
        .nb-cta-post {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 700;
          padding: 7px 16px; border-radius: 8px;
          border: none; color: #fff;
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
          text-decoration: none; white-space: nowrap; flex-shrink: 0;
          transition: opacity 0.14s, box-shadow 0.14s;
        }
        .nb-cta-post:hover { opacity: 0.92; box-shadow: 0 4px 14px rgba(30,64,175,0.4); }

        /* Auth buttons */
        .nb-btn-ghost {
          font-size: 13px; font-weight: 500;
          padding: 7px 14px; border-radius: 8px;
          border: 1px solid var(--border); color: var(--text-2);
          background: transparent; text-decoration: none;
          transition: background 0.14s, color 0.14s;
        }
        .nb-btn-ghost:hover { background: var(--bg-3); color: var(--text-1); }
        .nb-btn-signup {
          font-size: 13px; font-weight: 700;
          padding: 7px 16px; border-radius: 8px;
          border: none; color: #fff;
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
          text-decoration: none; transition: opacity 0.14s;
        }
        .nb-btn-signup:hover { opacity: 0.9; }

        /* User button */
        .nb-user-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 4px 10px 4px 4px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent;
          cursor: pointer; transition: background 0.14s, border-color 0.14s;
          flex-shrink: 0;
        }
        .nb-user-btn:hover { background: var(--bg-3); border-color: var(--border-2); }
        .nb-user-avatar {
          width: 28px; height: 28px; border-radius: 7px;
          background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15));
          border: 1.5px solid rgba(59,130,246,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 11.5px; font-weight: 700; color: #3b82f6; flex-shrink: 0;
        }
        .nb-user-name { font-size: 13px; font-weight: 500; color: var(--text-1); max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nb-user-chevron { transition: transform 0.18s; color: var(--text-3); display: inline-flex; align-items: center; }
        .nb-user-chevron.open { transform: rotate(180deg); }

        /* User dropdown */
        .nb-user-menu {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 220px; background: var(--panel);
          border: 1px solid var(--border-2); border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          overflow: hidden; z-index: 200;
          animation: nbUserDropIn 0.15s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes nbUserDropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nb-user-header { padding: 12px 14px 11px; border-bottom: 1px solid var(--border); }
        .nb-user-header-name  { font-size: 13px; font-weight: 600; color: var(--text-1); }
        .nb-user-header-email { font-size: 11px; color: var(--text-3); margin-top: 2px; font-family: 'IBM Plex Mono', monospace; }
        .nb-dropdown-item {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 14px; font-size: 13px; font-weight: 500; color: var(--text-2);
          text-decoration: none; background: transparent; border: none;
          width: 100%; text-align: left; cursor: pointer; font-family: inherit;
          transition: background 0.1s, color 0.1s;
        }
        .nb-dropdown-item:hover { background: var(--bg-3); color: var(--text-1); }
        .nb-dropdown-item.danger { color: var(--rose); }
        .nb-dropdown-item.danger:hover { background: var(--rose-dim); }
        .nb-dropdown-divider { height: 1px; background: var(--border); }

        /* ── MOBILE ──────────────────────────────── */
        .nb-hamburger {
          display: none; width: 36px; height: 36px;
          border-radius: 8px; border: 1px solid var(--border);
          background: transparent; color: var(--text-2);
          align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.14s;
        }
        .nb-hamburger:hover { background: var(--bg-3); }

        .nb-overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.45); z-index: 150;
          opacity: 0; transition: opacity 0.25s; pointer-events: none;
        }
        .nb-overlay.open { opacity: 1; pointer-events: all; }

        .nb-drawer {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(300px, 88vw);
          background: var(--panel);
          border-left: 1px solid var(--border);
          z-index: 160;
          display: flex; flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          overflow-y: auto; -webkit-overflow-scrolling: touch;
        }
        .nb-drawer.open { transform: translateX(0); }

        .nb-drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px; height: 62px;
          border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .nb-drawer-close {
          width: 32px; height: 32px; border-radius: 8px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text-2); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: background 0.14s;
        }
        .nb-drawer-close:hover { background: var(--bg-3); }

        .nb-drawer-user {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px 12px;
          border-bottom: 1px solid var(--border);
        }
        .nb-drawer-user-avatar {
          width: 38px; height: 38px; border-radius: 10px;
          background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15));
          border: 1.5px solid rgba(59,130,246,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: #3b82f6; flex-shrink: 0;
        }

        .nb-drawer-theme-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px 10px;
          border-bottom: 1px solid var(--border);
        }
        .nb-drawer-theme-label { font-size: 13px; color: var(--text-2); }

        .nb-drawer-section {
          font-size: 10px; font-weight: 700; letter-spacing: 0.09em;
          text-transform: uppercase; color: var(--text-3);
          padding: 14px 16px 4px;
        }

        .nb-drawer-links { list-style: none; margin: 0; padding: 4px 8px 0; }
        .nb-drawer-links li a,
        .nb-drawer-links li button {
          display: flex; align-items: center; gap: 11px;
          padding: 10px 12px; border-radius: 10px;
          font-size: 13.5px; font-weight: 500;
          color: var(--text-2); text-decoration: none;
          background: transparent; border: none; width: 100%;
          text-align: left; cursor: pointer; font-family: inherit;
          transition: background 0.1s, color 0.1s;
        }
        .nb-drawer-links li a:hover,
        .nb-drawer-links li button:hover { background: var(--bg-3); color: var(--text-1); }
        .nb-drawer-links li a.active { background: rgba(59,130,246,0.08); color: #2563eb; font-weight: 600; }
        .nb-drawer-icon {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .nb-drawer-divider { height: 1px; background: var(--border); margin: 8px 12px; }

        .nb-drawer-footer {
          padding: 12px 12px 28px; margin-top: auto;
          border-top: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 8px;
        }
        .nb-drawer-cta {
          display: flex; align-items: center; justify-content: center;
          padding: 11px 16px; border-radius: 10px;
          font-size: 13.5px; font-weight: 600;
          text-decoration: none; text-align: center; gap: 7px;
          transition: background 0.14s, border-color 0.14s, opacity 0.14s;
        }

        /* ── RESPONSIVE ──────────────────────────── */
        @media (max-width: 900px) {
          .nb-links        { display: none !important; }
          .nb-sep          { display: none !important; }
          .nb-hamburger    { display: flex !important; }
          .nb-overlay      { display: block; }
          .nb-desktop-only { display: none !important; }
          .nb-pill         { padding: 0 16px; }
          .nb-mobile-user-pill { display: flex !important; }
        }
        @media (max-width: 560px) {
          .nb-pill { padding: 0 12px; }
        }

        /* Mobile user pill — hidden on desktop */
        .nb-mobile-user-pill {
          display: none;
          align-items: center; gap: 6px;
          padding: 3px 10px 3px 4px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: transparent;
          margin-right: 4px;
        }
        .nb-mobile-user-name {
          font-size: 13px; font-weight: 500;
          color: var(--text-1);
          max-width: 80px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
      `}</style>

      <nav className={`nb-pill${scrolled ? ' scrolled' : ''}`} style={{ justifyContent: 'space-between' }}>

        {/* ── Logo ── */}
        <Link to="/" className="nb-logo">
          <div className="nb-logo-icon"><Icon.logo /></div>
          <span className="nb-logo-text">Salary<em>Insights</em></span>
        </Link>

        {/* ── Nav links ── */}
        <ul className="nb-links">
          <li>
            <Link to="/" className={`nb-link${isActive('/') ? ' active' : ''}`}>
              <span className="nb-nav-icon">{Icon.home(isActive('/') ? '#2563eb' : 'currentColor')}</span>
              Home
            </Link>
          </li>

          {/* Salaries dropdown */}
          <li ref={salariesRef} style={{ position: 'relative' }}
            onMouseEnter={() => setSalariesOpen(true)}
            onMouseLeave={() => setSalariesOpen(false)}
          >
            <button
              className={`nb-dropdown-trigger${salariesActive ? ' active' : ''}`}
              onClick={() => { navigate('/salaries'); setSalariesOpen(o => !o); }}
            >
              <span className="nb-nav-icon">{Icon.salaries(salariesActive ? '#2563eb' : 'currentColor')}</span>
              Salaries
              <span className={`nb-chevron${salariesOpen ? ' open' : ''}`}><Icon.chevronDown /></span>
            </button>

            {salariesOpen && (
              <div className="nb-salaries-menu">
                {salariesItems.map(item => (
                  <Link key={item.to} to={item.to} className="nb-menu-item">
                    <div className="nb-menu-icon" style={{ background: item.iconBg }}>
                      <item.icon />
                    </div>
                    <div>
                      <div className="nb-menu-label">{item.label}</div>
                      <div className="nb-menu-desc">{item.desc}</div>
                    </div>
                  </Link>
                ))}
                <div className="nb-menu-divider"/>
                <Link to="/submit" className="nb-menu-footer">
                  <Icon.share />
                  Share your salary — help the community
                </Link>
              </div>
            )}
          </li>

          <li>
            <Link to="/companies" className={`nb-link${isActive('/companies') ? ' active' : ''}`}>
              <span className="nb-nav-icon">{Icon.companies(isActive('/companies') ? '#2563eb' : 'currentColor')}</span>
              Companies
            </Link>
          </li>
          <li>
            <Link to="/dashboard" className={`nb-link${isActive('/dashboard') ? ' active' : ''}`}>
              <span className="nb-nav-icon">{Icon.analytics(isActive('/dashboard') ? '#2563eb' : 'currentColor')}</span>
              Analytics
            </Link>
          </li>
          <li>
            <Link to="/opportunities" className={`nb-link${isActive('/opportunities') ? ' active' : ''}`}>
              <span className="nb-nav-icon">{Icon.opps(isActive('/opportunities') ? '#2563eb' : 'currentColor')}</span>
              Opportunities
            </Link>
          </li>
          {user?.role === 'ADMIN' && (
            <li>
              <Link to="/admin" className={`nb-link${isActive('/admin') ? ' active' : ''}`}>
                <span className="nb-nav-icon">{Icon.admin(isActive('/admin') ? '#2563eb' : 'currentColor')}</span>
                Admin
              </Link>
            </li>
          )}
        </ul>

        {/* ── Right actions ── */}
        <div className="nb-actions">

          <button className="nb-theme-btn nb-desktop-only" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Icon.sun /> : <Icon.moon />}
          </button>

          {user ? (
            <div className="nb-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Link to="/submit" className="nb-cta-share">
                <Icon.share /> Share Salary
              </Link>
              <Link to="/opportunities/post" className="nb-cta-post">
                <Icon.plus /> Post Role
              </Link>

              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button className="nb-user-btn" onClick={() => setDropdownOpen(o => !o)}>
                  <div className="nb-user-avatar">{userInitial}</div>
                  <span className="nb-user-name">{firstName}</span>
                  <span className={`nb-user-chevron${dropdownOpen ? ' open' : ''}`}><Icon.chevronDown /></span>
                </button>

                {dropdownOpen && (
                  <div className="nb-user-menu">
                    <div className="nb-user-header">
                      <div className="nb-user-header-name">{displayName}</div>
                      <div className="nb-user-header-email">{user.email}</div>
                    </div>
                    <Link to="/my-submissions" className="nb-dropdown-item">
                      <Icon.myDocs /> My Submissions
                    </Link>
                    <Link to="/opportunities/post" className="nb-dropdown-item">
                      <Icon.postOpp /> Post Opportunity
                    </Link>
                    <div className="nb-dropdown-divider"/>
                    <button className="nb-dropdown-item danger" onClick={handleLogout}>
                      <Icon.logout /> Sign out
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

          {/* Mobile user avatar (shown on mobile only, next to hamburger) */}
          {user && (
            <div className="nb-mobile-user-pill">
              <div className="nb-user-avatar" style={{ width: 28, height: 28 }}>{userInitial}</div>
              <span className="nb-mobile-user-name">{firstName}</span>
            </div>
          )}

          {/* Hamburger */}
          <button className="nb-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Open menu">
            {mobileOpen ? <Icon.close /> : <Icon.menu />}
          </button>
        </div>
      </nav>

      {/* ── Mobile overlay ── */}
      <div className={`nb-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />

      {/* ── Mobile drawer ── */}
      <div className={`nb-drawer${mobileOpen ? ' open' : ''}`}>

        <div className="nb-drawer-header">
          <Link to="/" className="nb-logo" onClick={() => setMobileOpen(false)}>
            <div className="nb-logo-icon"><Icon.logo /></div>
            <span className="nb-logo-text">Salary<em>Insights</em></span>
          </Link>
          <button className="nb-drawer-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <Icon.close />
          </button>
        </div>

        {user && (
          <div className="nb-drawer-user">
            <div className="nb-drawer-user-avatar">{userInitial}</div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>{displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{user.email}</div>
            </div>
          </div>
        )}

        <div className="nb-drawer-section">Navigate</div>
        <ul className="nb-drawer-links">
          {navItems.map(item => (
            <li key={item.to}>
              <Link to={item.to} className={isActive(item.to) ? 'active' : ''} onClick={() => setMobileOpen(false)}>
                <span className="nb-drawer-icon" style={{ background: isActive(item.to) ? 'rgba(59,130,246,0.1)' : 'var(--bg-3)' }}>
                  {item.icon(isActive(item.to) ? '#2563eb' : 'var(--text-2)')}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
          {user?.role === 'ADMIN' && (
            <li>
              <Link to="/admin" className={isActive('/admin') ? 'active' : ''} onClick={() => setMobileOpen(false)}>
                <span className="nb-drawer-icon" style={{ background: isActive('/admin') ? 'rgba(59,130,246,0.1)' : 'var(--bg-3)' }}>
                  {Icon.admin(isActive('/admin') ? '#2563eb' : 'var(--text-2)')}
                </span>
                Admin
              </Link>
            </li>
          )}
        </ul>

        <div className="nb-drawer-section">Salaries</div>
        <ul className="nb-drawer-links">
          {salariesItems.map(item => (
            <li key={item.to}>
              <Link to={item.to} onClick={() => setMobileOpen(false)}>
                <span className="nb-drawer-icon" style={{ background: item.iconBg }}>
                  <item.icon />
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {user && (
          <>
            <div className="nb-drawer-divider"/>
            <ul className="nb-drawer-links">
              <li>
                <Link to="/my-submissions" onClick={() => setMobileOpen(false)}>
                  <span className="nb-drawer-icon" style={{ background: 'var(--bg-3)' }}><Icon.myDocs /></span>
                  My Submissions
                </Link>
              </li>
            </ul>
          </>
        )}

        <div className="nb-drawer-footer">
          {user ? (
            <>
              <Link to="/submit" className="nb-drawer-cta" onClick={() => setMobileOpen(false)}
                style={{ border: '1px solid rgba(22,163,74,0.35)', color: '#15803d', background: 'rgba(22,163,74,0.07)' }}>
                <Icon.share /> Share Salary
              </Link>
              <Link to="/opportunities/post" className="nb-drawer-cta" onClick={() => setMobileOpen(false)}
                style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: '#fff' }}>
                <Icon.plus /> Post Role
              </Link>
              <button onClick={handleLogout} className="nb-drawer-cta"
                style={{ border: '1px solid var(--border)', color: 'var(--rose)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                <Icon.logout /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="nb-drawer-cta" onClick={() => setMobileOpen(false)} style={{ border: '1px solid var(--border)', color: 'var(--text-1)', background: 'transparent' }}>Sign in</Link>
              <Link to="/register" className="nb-drawer-cta" onClick={() => setMobileOpen(false)} style={{ background: 'linear-gradient(135deg,#1e40af,#2563eb)', color: '#fff' }}>Sign up</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar() {
  const location         = useLocation();
  const { user, logout } = useContext(AuthContext);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const isActive    = (path) => location.pathname === path ? 'active' : '';

  // Build display name from firstName/lastName or fall back to email
  const displayName = user
    ? (user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : user.email)
    : null;

  return (
    <nav className="navbar">
      {/* ── LOGO ── */}
      <Link to="/" className="nav-logo">
        <div className="logo-mark">360</div>
        <span className="logo-text">
          <span className="w-salary">Salary</span>
          <span className="w-insights">Insights</span>
          <em className="brand-360">360</em>
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
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            /* Sun icon */
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"  x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1"  y1="12" x2="3"  y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78"  x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            /* Moon icon */
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {user ? (
          <>
            {/* Welcome message */}
            <span className="nav-welcome">
              👋 {displayName}
            </span>
            <button className="btn-ghost" onClick={logout}>Sign out</button>
            <Link to="/submit" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Submit Salary
            </Link>
          </>
        ) : (
          <>
            <Link to="/login"  className="btn-ghost"   style={{ textDecoration: 'none' }}>Sign in</Link>
            <Link to="/submit" className="btn-primary"  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Submit Salary
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function Navbar() {
  const location  = useLocation();
  const { user, logout } = useContext(AuthContext);

  const isActive = (path) => location.pathname === path ? 'active' : '';

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
        {user ? (
          <>
            <button className="btn-ghost" onClick={logout}>Sign out</button>
            <Link to="/submit" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Submit Salary
            </Link>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-ghost" style={{ textDecoration: 'none' }}>Sign in</Link>
            <Link to="/submit" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Submit Salary
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

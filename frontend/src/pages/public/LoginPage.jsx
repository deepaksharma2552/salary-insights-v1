import { useState, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

// Determine backend base URL — in dev the API is proxied, in prod it's the same origin
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export default function LoginPage() {
  const { login }    = useContext(AuthContext);
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(searchParams.get('error') ?? '');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password. Please try again.');
    }
  }

  function handleGoogleLogin() {
    // Redirect browser to Spring's OAuth2 initiation endpoint
    window.location.href = `${API_BASE}/api/oauth2/authorization/google`;
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">

        {/* ── LOGO ── */}
        <div className="auth-logo">
          <div className="logo-mark" style={{ margin: '0 auto 16px', width: 48, height: 48, fontSize: 12 }}>360</div>
          <div className="logo-text" style={{ justifyContent: 'center', marginBottom: 4 }}>
            <span className="w-salary" style={{ fontSize: 17 }}>Salary</span>
            <span className="w-insights" style={{ fontSize: 18 }}>Insights</span>
            <em className="brand-360" style={{ fontSize: 11 }}>360</em>
          </div>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your 360° dashboard</p>

        {error && (
          <div style={{
            padding: '12px 16px', background: 'var(--rose-dim)',
            border: '1px solid rgba(224,92,122,0.2)', borderRadius: 10,
            color: 'var(--rose)', fontSize: 13, marginBottom: 8
          }}>
            {error}
          </div>
        )}

        {/* ── Google SSO ── */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '11px 16px', borderRadius: 10, cursor: 'pointer',
            background: 'var(--panel)', border: '1px solid var(--border)',
            fontSize: 14, fontWeight: 500, color: 'var(--text-1)',
            marginBottom: 16, transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--panel)'}
        >
          {/* Google "G" logo */}
          <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider">or sign in with email</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-auth">Sign In</button>
          <div className="auth-divider">or</div>
          <Link
            to="/register"
            className="btn-ghost"
            style={{ width: '100%', padding: 12, textAlign: 'center', fontSize: 14, textDecoration: 'none', display: 'block' }}
          >
            Create an account →
          </Link>
        </form>

      </div>
    </div>
  );
}

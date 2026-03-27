import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

// Determine backend base URL — in dev the API is proxied, in prod it's the same origin
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export default function RegisterPage() {
  const { register } = useContext(AuthContext);
  const navigate     = useNavigate();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.message ?? 'Registration failed. Please try again.');
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${API_BASE}/api/oauth2/authorization/google`;
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">

        {/* ── LOGO ── */}
        <div className="auth-logo">
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
            <svg width="44" height="44" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="19" cy="19" r="18" stroke="#3b82f6" strokeWidth="0.8" fill="none"
                style={{ transformOrigin: '19px 19px', animation: 'siOrbitPing 3s ease-out infinite' }} />
              <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitTrack 20s linear infinite' }}>
                <circle cx="19" cy="19" r="15" stroke="#3b82f6" strokeWidth="0.7" fill="none" opacity="0.25" strokeDasharray="2.5 2.5" />
              </g>
              <circle cx="19" cy="19" r="9" stroke="#3b82f6" strokeWidth="0.5" fill="none" opacity="0.12" strokeDasharray="1.5 2" />
              <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitSweepA 6s linear infinite' }}>
                <circle cx="19" cy="4" r="2.4" fill="#3b82f6" />
              </g>
              <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitSweepB 6s linear infinite' }}>
                <circle cx="19" cy="4" r="2" fill="#2563eb" />
              </g>
              <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitSweepC 9s linear infinite' }}>
                <circle cx="19" cy="4" r="1.6" fill="#60a5fa" opacity="0.7" />
              </g>
              <g style={{ transformOrigin: '19px 19px', animation: 'siOrbitCore 3s ease-in-out infinite' }}>
                <circle cx="19" cy="19" r="7"   fill="#3b82f6" opacity="0.1" />
                <circle cx="19" cy="19" r="4.5" fill="#3b82f6" opacity="0.2" />
                <circle cx="19" cy="19" r="2.8" fill="#3b82f6" />
              </g>
            </svg>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1 }}>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-1)', fontFamily: 'Inter,sans-serif' }}>
                Salary<span style={{ color: '#3b82f6' }}>Insights</span>
              </span>
              <span style={{ fontSize: 8.5, fontWeight: 500, letterSpacing: '0.12em', color: '#3b82f6', fontFamily: "'IBM Plex Mono',monospace", textTransform: 'uppercase', opacity: 0.75 }}>
                360° Career Clarity
              </span>
            </span>
          </div>
        </div>

        <h2 className="auth-title">Join the community</h2>
        <p className="auth-subtitle">Get the full 360° picture on compensation</p>

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
          <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider">or sign up with email</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="First and last name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
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
              placeholder="Min. 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn-auth">Create Account</button>
          <div className="auth-divider">or</div>
          <Link
            to="/login"
            className="btn-ghost"
            style={{ width: '100%', padding: 12, textAlign: 'center', fontSize: 14, textDecoration: 'none', display: 'block' }}
          >
            Already have an account? Sign in →
          </Link>
        </form>

      </div>
    </div>
  );
}

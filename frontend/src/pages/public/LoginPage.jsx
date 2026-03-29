import { useState, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import BrandLogo from '../../components/shared/BrandLogo';

// Determine backend base URL — in dev the API is proxied, in prod it's the same origin
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export default function LoginPage() {
  const { login }      = useContext(AuthContext);
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState(
    searchParams.get('oauthError') ?? searchParams.get('error') ?? ''
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    // Guard: already in-flight (double-submit protection via disabled, but belt-and-suspenders)
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      // On success — navigate away; loading state disappears naturally with the unmount
      navigate('/');
    } catch {
      // On error — stop spinner, show message, re-enable button
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${API_BASE}/api/oauth2/authorization/google`;
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      {/* ── Keyframe animations ── */}
      <style>{`
        /* Button spinner */
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Progress bar: crawls to ~90% and parks there waiting for the real response.
           cubic-bezier decelerates it — starts fast, slows way down near 90%. */
        @keyframes progressCrawl {
          0%   { width: 0%;  }
          40%  { width: 65%; }
          70%  { width: 82%; }
          90%  { width: 88%; }
          100% { width: 90%; }
        }
      `}</style>

      <div className="auth-card">

        {/* ── Logo — matches Navbar exactly ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <BrandLogo size={38} fontSize={18} gap={10} />
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your 360° dashboard</p>

        {/* ── Error banner — appears on failure, clears on next attempt ── */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--rose-dim)',
            border: '1px solid rgba(224,92,122,0.2)',
            borderRadius: 10,
            color: 'var(--rose)',
            fontSize: 13,
            marginBottom: 8,
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>

          {/* ── Submit + progress bar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/*
              disabled={loading}  → browser-native prevention of re-submission
              opacity 0.65        → clear visual signal that button is inert
              cursor not-allowed  → reinforces non-interactive state
              loading guard in handleSubmit → belt-and-suspenders
            */}
            <button
              type="submit"
              className="btn-auth"
              disabled={loading}
              style={{
                opacity:    loading ? 0.65 : 1,
                cursor:     loading ? 'not-allowed' : 'pointer',
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity 0.2s ease, background 0.15s',
              }}
            >
              {loading ? (
                <>
                  {/* Spinner — left of "Signing in…" text */}
                  <div style={{
                    width: 15,
                    height: 15,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.30)',
                    borderTopColor: 'white',
                    animation: 'spin 0.7s linear infinite',
                    flexShrink: 0,
                  }} />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/*
              Sky-blue progress bar — mounts when loading starts, unmounts when:
                • success → navigate() tears down this component entirely
                • error   → loading set to false, bar conditionally removed
              animation-fill-mode: forwards keeps it parked at 90%.
            */}
            {loading && (
              <div style={{
                width: '100%',
                height: 3,
                background: 'rgba(14,165,233,0.15)',
                borderRadius: 99,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
                  borderRadius: 99,
                  animation: 'progressCrawl 3s cubic-bezier(0.05, 0.6, 0.4, 1) forwards',
                }} />
              </div>
            )}
          </div>

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

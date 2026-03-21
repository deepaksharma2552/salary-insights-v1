import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

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

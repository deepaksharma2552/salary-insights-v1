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
      <style>{`
        @keyframes navRingSpin    { to { transform: rotate(360deg);  } }
        @keyframes navRingSpinRev { to { transform: rotate(-360deg); } }
      `}</style>
      <div className="auth-card">

        {/* ── LOGO — matches Navbar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 8 }}>
            <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
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
                position: 'absolute', inset: 9, borderRadius: 6,
                background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1, fontFamily: 'Inter,sans-serif' }}>SI</span>
                <span style={{ fontSize: 6, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.05em', fontFamily: "'IBM Plex Mono',monospace", marginTop: 1 }}>360°</span>
              </div>
            </div>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 0, lineHeight: 1 }}>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-1)', fontFamily: 'Inter,sans-serif' }}>
                Salary<span style={{ color: '#0ea5e9' }}>Insights</span>
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', color: '#0ea5e9', fontFamily: "'IBM Plex Mono',monospace", opacity: 0.8 }}>
                360° COMPENSATION
              </span>
            </span>
          </Link>
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

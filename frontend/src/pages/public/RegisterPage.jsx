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
          <div className="logo-mark" style={{ margin: '0 auto 16px', width: 48, height: 48, fontSize: 12 }}>360</div>
          <div className="logo-text" style={{ justifyContent: 'center', marginBottom: 4 }}>
            <span className="w-salary" style={{ fontSize: 17 }}>Salary</span>
            <span className="w-insights" style={{ fontSize: 18 }}>Insights</span>
            <em className="brand-360" style={{ fontSize: 11 }}>360</em>
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

import { useEffect, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

/**
 * Landing page for Google OAuth2 callback.
 *
 * The Spring backend redirects here after a successful OAuth2 login:
 *   /oauth2/redirect?token=...&email=...&firstName=...&lastName=...&role=...
 *
 * This component reads those params, stores the token + user in
 * localStorage (same shape as the normal login flow), hydrates
 * AuthContext, then navigates to the home page.
 *
 * On error (missing token or ?error=... param) it redirects to
 * /login?oauthError=true so the LoginPage can show a message.
 */
export default function OAuth2RedirectPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useContext(AuthContext);
  const handled = useRef(false); // prevent double-run in StrictMode

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const error     = searchParams.get('error');
    const token     = searchParams.get('token');
    const email     = searchParams.get('email');
    const firstName = searchParams.get('firstName');
    const lastName  = searchParams.get('lastName');
    const role      = searchParams.get('role');

    if (error || !token) {
      navigate('/login?oauthError=true', { replace: true });
      return;
    }

    // Persist exactly the same shape the normal login uses
    const userData = { email, firstName, lastName, role };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    // Tell AuthContext about the new session without a round-trip
    loginWithToken(userData);

    navigate('/', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 16,
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid rgba(14,165,233,0.2)',
        borderTopColor: '#0ea5e9',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--text-3)', fontSize: 14, fontFamily: "'JetBrains Mono',monospace" }}>
        Signing you in…
      </p>
    </div>
  );
}

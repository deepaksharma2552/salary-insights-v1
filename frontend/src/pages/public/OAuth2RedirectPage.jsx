import { useEffect, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

/**
 * Landing page for Google OAuth2 callback.
 *
 * The Spring backend redirects here after a successful OAuth2 login:
 *   /oauth2/redirect?email=...&firstName=...&lastName=...&role=...
 *
 * The JWT is now in an httpOnly cookie set by the backend — it never
 * appears in the URL. This component reads only the non-sensitive user
 * profile params, hydrates AuthContext, then navigates home.
 *
 * On error (?error=... param) it redirects to /login?oauthError=true.
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
    const email     = searchParams.get('email');
    const firstName = searchParams.get('firstName');
    const lastName  = searchParams.get('lastName');
    const role      = searchParams.get('role');

    // If the backend signalled an error, or the required profile fields are missing
    if (error || !email) {
      navigate('/login?oauthError=true', { replace: true });
      return;
    }

    // Hydrate AuthContext with the profile (token lives in the httpOnly cookie,
    // not in JS-land — loginWithToken only stores the non-sensitive user object).
    const userData = { email, firstName, lastName, role };
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

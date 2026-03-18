import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function OAuth2RedirectPage() {
  const navigate = useNavigate();
  const { loginWithToken, loading } = useContext(AuthContext);

  useEffect(() => {
    // Parse directly from window.location.search — immune to hash fragments
    // and router quirks that can affect useSearchParams
    const raw    = window.location.search || window.location.hash.replace(/^#\/?/, '?');
    const params = new URLSearchParams(raw.startsWith('?') ? raw : '?' + raw);

    const token     = params.get('token');
    const error     = params.get('error');
    const email     = params.get('email');
    const firstName = params.get('firstName');
    const lastName  = params.get('lastName');
    const role      = params.get('role');

    if (error) {
      navigate('/login?oauthError=' + encodeURIComponent(error), { replace: true });
      return;
    }

    if (token) {
      // Store directly in localStorage — don't depend on context being ready
      const userData = { email, firstName, lastName, role };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      // Also call context method if available
      if (typeof loginWithToken === 'function') {
        loginWithToken({ token, email, firstName, lastName, role });
      }
      navigate('/', { replace: true });
      return;
    }

    navigate('/login', { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // re-run once context finishes loading

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: 16,
      color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13,
    }}>
      <div style={{
        width: 32, height: 32, border: '3px solid var(--border)',
        borderTopColor: 'var(--blue)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      Signing you in…
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

/**
 * Landing page for OAuth2 redirect.
 * Backend redirects here with ?token=...&email=...&firstName=...&lastName=...&role=...
 * or ?error=... on failure.
 */
export default function OAuth2RedirectPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const { loginWithToken } = useContext(AuthContext);

  useEffect(() => {
    const token     = params.get('token');
    const error     = params.get('error');
    const email     = params.get('email');
    const firstName = params.get('firstName');
    const lastName  = params.get('lastName');
    const role      = params.get('role');

    if (error) {
      navigate('/login?error=' + encodeURIComponent(error), { replace: true });
      return;
    }

    if (token) {
      loginWithToken({ token, email, firstName, lastName, role });
      navigate('/', { replace: true });
      return;
    }

    // Shouldn't happen — redirect to login as fallback
    navigate('/login', { replace: true });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>
      Signing you in…
    </div>
  );
}

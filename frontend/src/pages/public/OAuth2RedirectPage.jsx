import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * Landing page at /oauth2/redirect
 * Spring redirects here after a successful (or failed) OAuth2 login with:
 *   ?token=...&email=...&firstName=...&lastName=...&role=...
 * or
 *   ?error=...
 */
export default function OAuth2RedirectPage() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const { setUserFromOAuth } = useAuth();

  useEffect(() => {
    const error = params.get('error');
    if (error) {
      toast.error('Social login failed: ' + decodeURIComponent(error));
      navigate('/login');
      return;
    }

    const token     = params.get('token');
    const email     = params.get('email');
    const firstName = params.get('firstName');
    const lastName  = params.get('lastName');
    const role      = params.get('role');

    if (!token) {
      toast.error('No token received — please try again');
      navigate('/login');
      return;
    }

    // Persist auth state exactly like normal login
    const userData = { email, firstName, lastName, role };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUserFromOAuth(userData);

    toast.success(`Welcome, ${firstName}!`);
    navigate(role === 'ADMIN' ? '/admin' : '/');
  }, []);

  return (
    <Box sx={{
      bgcolor: '#0f0f1a', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 3
    }}>
      <CircularProgress size={56} sx={{ color: '#e94560' }} />
      <Typography variant="h6" color="white">Completing sign-in…</Typography>
    </Box>
  );
}

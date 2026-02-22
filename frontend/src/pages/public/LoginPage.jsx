import { useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Alert, Link, Divider } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const OAUTH2_BASE = '/api/oauth2/authorize';

const SOCIAL_PROVIDERS = [
  {
    id: 'google', label: 'Continue with Google',
    bg: '#fff', color: '#3c4043', border: '#dadce0', hoverBg: '#f8f9fa',
    logo: (
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
    ),
  },
  {
    id: 'facebook', label: 'Continue with Facebook',
    bg: '#1877f2', color: '#fff', border: '#1877f2', hoverBg: '#166fe5',
    logo: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'linkedin', label: 'Continue with LinkedIn',
    bg: '#0a66c2', color: '#fff', border: '#0a66c2', hoverBg: '#004182',
    logo: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(user.role === 'ADMIN' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    }
  };

  const handleSocialLogin = (providerId) => {
    window.location.href = `${OAUTH2_BASE}/${providerId}`;
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
      '&:hover fieldset': { borderColor: '#e94560' },
      '&.Mui-focused fieldset': { borderColor: '#e94560' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
    '& .MuiInputBase-input': { color: 'white' },
  };

  return (
    <Box sx={{
      bgcolor: '#0f0f1a', minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(233,69,96,0.05) 0%, transparent 60%)',
    }}>
      <Container maxWidth="xs">
        <Paper sx={{
          p: 4, bgcolor: '#1a1a2e',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 3,
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: 2, mx: 'auto', mb: 1.5,
              background: 'linear-gradient(135deg, #e94560, #9333ea)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 20 }}>$</Typography>
            </Box>
            <Typography variant="h5" fontWeight={800} color="white">Welcome back</Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5 }}>
              Sign in to Salary Insights
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            {SOCIAL_PROVIDERS.map(p => (
              <Button key={p.id} fullWidth onClick={() => handleSocialLogin(p.id)}
                sx={{
                  bgcolor: p.bg, color: p.color, border: `1px solid ${p.border}`,
                  borderRadius: 2, py: 1.2, textTransform: 'none',
                  fontWeight: 600, fontSize: 14,
                  display: 'flex', gap: 1.5, justifyContent: 'center',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: p.hoverBg, transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)' },
                }}>
                {p.logo}
                {p.label}
              </Button>
            ))}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 3 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', px: 1 }}>
              or continue with email
            </Typography>
          </Divider>

          {error && (
            <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(248,113,113,0.08)',
              color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Email" type="email" sx={{ ...inputSx, mb: 2 }}
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            <TextField fullWidth label="Password" type="password" sx={{ ...inputSx, mb: 3 }}
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            <Button type="submit" fullWidth disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #e94560, #c73652)',
                py: 1.4, mb: 2, borderRadius: 2, fontWeight: 700,
                fontSize: 15, textTransform: 'none', color: 'white',
                boxShadow: '0 4px 16px rgba(233,69,96,0.3)',
                '&:hover': { boxShadow: '0 6px 20px rgba(233,69,96,0.45)', transform: 'translateY(-1px)' },
              }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <Typography variant="body2" textAlign="center" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register"
              sx={{ color: '#e94560', fontWeight: 600, textDecoration: 'none' }}>
              Create one
            </Link>
          </Typography>

          <Box sx={{ mt: 3, p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)' }}>
              Demo: admin@salaryinsights.com / Admin@123
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

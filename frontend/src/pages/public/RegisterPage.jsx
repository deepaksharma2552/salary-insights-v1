import { useState } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, Alert, Link } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
      '&:hover fieldset': { borderColor: '#e94560' }, '&.Mui-focused fieldset': { borderColor: '#e94560' } },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiInputBase-input': { color: 'white' },
  };

  return (
    <Box sx={{ bgcolor: '#0f0f1a', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="xs">
        <Paper sx={{ p: 4, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography variant="h5" fontWeight={700} color="white" gutterBottom textAlign="center">
            Create Account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="First Name" sx={{ ...inputSx, mb: 2 }}
              value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
            <TextField fullWidth label="Last Name" sx={{ ...inputSx, mb: 2 }}
              value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
            <TextField fullWidth label="Email" type="email" sx={{ ...inputSx, mb: 2 }}
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            <TextField fullWidth label="Password" type="password" sx={{ ...inputSx, mb: 3 }}
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required helperText={<span style={{ color: 'rgba(255,255,255,0.3)' }}>Min 8 characters</span>} />
            <Button
              type="submit" fullWidth variant="contained" disabled={loading}
              sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73652' }, py: 1.5, mb: 2 }}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>

          <Typography variant="body2" textAlign="center" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" sx={{ color: '#e94560' }}>Sign In</Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

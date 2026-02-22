import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AppBar, Toolbar, Typography, Button, Box, Chip, Avatar
} from '@mui/material';
import { MonetizationOn, Dashboard } from '@mui/icons-material';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <AppBar position="sticky" sx={{ bgcolor: '#1a1a2e' }}>
      <Toolbar>
        <MonetizationOn sx={{ mr: 1, color: '#e94560' }} />
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{ flexGrow: 0, color: 'white', textDecoration: 'none', fontWeight: 700, mr: 4 }}
        >
          Salary Insights
        </Typography>

        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          <Button color="inherit" component={Link} to="/salaries">Salaries</Button>
          <Button color="inherit" component={Link} to="/companies">Companies</Button>
          <Button color="inherit" component={Link} to="/dashboard">Analytics</Button>
          {user && <Button color="inherit" component={Link} to="/submit">Submit Salary</Button>}
          {user?.role === 'ADMIN' && (
            <Button
              color="inherit"
              component={Link}
              to="/admin"
              startIcon={<Dashboard />}
              sx={{ color: '#e94560' }}
            >
              Admin
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user ? (
            <>
              <Chip
                avatar={<Avatar>{user.firstName?.[0]}</Avatar>}
                label={`${user.firstName} ${user.lastName}`}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)', border: '1px solid' }}
              />
              <Button color="inherit" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">Login</Button>
              <Button
                variant="contained"
                sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73652' } }}
                component={Link}
                to="/register"
              >
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

import { Box, Typography, Button, Container, Grid, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import { TrendingUp, Search, BarChart, Security } from '@mui/icons-material';
import Navbar from '../../components/shared/Navbar';

const features = [
  { icon: <Search fontSize="large" />, title: 'Search Salaries', desc: 'Browse thousands of salary data points filtered by company, title, location, and level.' },
  { icon: <BarChart fontSize="large" />, title: 'Analytics Dashboard', desc: 'Visualize salary trends across standardized levels, locations, and companies.' },
  { icon: <TrendingUp fontSize="large" />, title: 'Level Comparisons', desc: 'Compare your comp across companies using our standardized level mapping system.' },
  { icon: <Security fontSize="large" />, title: 'Anonymous Submissions', desc: 'Submit your salary data anonymously and help others make informed decisions.' },
];

export default function HomePage() {
  return (
    <Box sx={{ bgcolor: '#0f0f1a', minHeight: '100vh', color: 'white' }}>
      <Navbar />

      {/* Hero */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        py: 12, textAlign: 'center'
      }}>
        <Container>
          <Typography variant="h2" fontWeight={800} gutterBottom>
            Know Your Worth.{' '}
            <Box component="span" sx={{ color: '#e94560' }}>Negotiate Better.</Box>
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 4, maxWidth: 600, mx: 'auto' }}>
            Real salary data from real professionals. Transparent, cross-company level comparisons
            powered by our intelligent mapping system.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/salaries"
              sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73652' }, px: 4, py: 1.5 }}
            >
              Explore Salaries
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              to="/submit"
              sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: '#e94560', color: '#e94560' }, px: 4, py: 1.5 }}
            >
              Share Your Salary
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features */}
      <Container sx={{ py: 10 }}>
        <Typography variant="h4" textAlign="center" fontWeight={700} gutterBottom>
          Why Salary Insights?
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {features.map((f) => (
            <Grid item xs={12} sm={6} md={3} key={f.title}>
              <Paper sx={{
                p: 3, textAlign: 'center', bgcolor: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'transform 0.2s, border-color 0.2s',
                '&:hover': { transform: 'translateY(-4px)', borderColor: '#e94560' }
              }}>
                <Box sx={{ color: '#e94560', mb: 2 }}>{f.icon}</Box>
                <Typography variant="h6" fontWeight={600} gutterBottom color="white">{f.title}</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>{f.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

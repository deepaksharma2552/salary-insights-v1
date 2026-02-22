import { useState, useEffect } from 'react';
import {
  Box, Container, Paper, Typography, TextField, MenuItem, Button,
  Alert, Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/shared/Navbar';
import { publicApi, userApi } from '../../services/api';
import toast from 'react-hot-toast';

const EXPERIENCE_LEVELS = ['INTERN', 'ENTRY', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'C_LEVEL'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'];

export default function SubmitSalaryPage() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    companyId: '', jobTitle: '', department: '', experienceLevel: '',
    companyInternalLevel: '', location: '', baseSalary: '', bonus: '',
    equity: '', employmentType: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    publicApi.getCompanies({ size: 200 }).then(res => setCompanies(res.data.data.content));
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const inputSx = {
    '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
      '&.Mui-focused fieldset': { borderColor: '#e94560' } },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiInputBase-input': { color: 'white' },
    '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.5)' },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        baseSalary: parseFloat(form.baseSalary),
        bonus: form.bonus ? parseFloat(form.bonus) : null,
        equity: form.equity ? parseFloat(form.equity) : null,
      };
      await userApi.submitSalary(payload);
      toast.success('Salary submitted for review!');
      navigate('/salaries');
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#0f0f1a', minHeight: '100vh' }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography variant="h5" fontWeight={700} color="white" gutterBottom>
            Submit Your Salary
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
            Your submission will be reviewed before being published. Data is anonymized.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth required label="Company" sx={inputSx}
                  value={form.companyId} onChange={set('companyId')}>
                  <MenuItem value="">Select Company</MenuItem>
                  {companies.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Job Title" sx={inputSx}
                  value={form.jobTitle} onChange={set('jobTitle')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Department" sx={inputSx}
                  value={form.department} onChange={set('department')} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Company Internal Level (e.g. L4, SDE-II)" sx={inputSx}
                  value={form.companyInternalLevel} onChange={set('companyInternalLevel')}
                  helperText={<span style={{ color: 'rgba(255,255,255,0.3)' }}>Used for level mapping</span>} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth required label="Experience Level" sx={inputSx}
                  value={form.experienceLevel} onChange={set('experienceLevel')}>
                  {EXPERIENCE_LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth required label="Employment Type" sx={inputSx}
                  value={form.employmentType} onChange={set('employmentType')}>
                  {EMPLOYMENT_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Location" sx={inputSx}
                  value={form.location} onChange={set('location')}
                  placeholder="e.g. San Francisco, CA" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required label="Base Salary ($)" type="number" sx={inputSx}
                  value={form.baseSalary} onChange={set('baseSalary')} inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Bonus ($)" type="number" sx={inputSx}
                  value={form.bonus} onChange={set('bonus')} inputProps={{ min: 0 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Equity / RSU ($)" type="number" sx={inputSx}
                  value={form.equity} onChange={set('equity')} inputProps={{ min: 0 }} />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              <Button
                type="submit" variant="contained" size="large" disabled={submitting}
                sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73652' }, px: 4 }}
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </Button>
              <Button
                variant="outlined" size="large"
                onClick={() => navigate('/salaries')}
                sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}

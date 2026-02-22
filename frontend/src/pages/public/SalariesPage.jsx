import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Grid, Paper, TextField, MenuItem,
  Chip, CircularProgress, Pagination, Divider
} from '@mui/material';
import { MonetizationOn, Work, LocationOn, TrendingUp } from '@mui/icons-material';
import Navbar from '../../components/shared/Navbar';
import { publicApi } from '../../services/api';

const EXPERIENCE_LEVELS = ['INTERN', 'ENTRY', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'C_LEVEL'];

const fmt = (n) => n ? `$${Number(n).toLocaleString()}` : '—';

function SalaryCard({ salary }) {
  return (
    <Paper sx={{
      p: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)',
      transition: '0.2s', '&:hover': { borderColor: '#e94560', transform: 'translateY(-2px)' }
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography variant="h6" color="white" fontWeight={700}>{salary.jobTitle}</Typography>
        <Chip
          label={salary.experienceLevel}
          size="small"
          sx={{ bgcolor: 'rgba(233,69,96,0.2)', color: '#e94560', fontWeight: 600 }}
        />
      </Box>
      <Typography variant="body2" sx={{ color: '#e94560', mb: 1, fontWeight: 600 }}>
        {salary.companyName}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {salary.location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOn fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>{salary.location}</Typography>
          </Box>
        )}
        {salary.department && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Work fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>{salary.department}</Typography>
          </Box>
        )}
        {salary.standardizedLevelName && (
          <Chip label={`Level: ${salary.standardizedLevelName}`} size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }} />
        )}
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mb: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Base</Typography>
          <Typography variant="body1" color="white" fontWeight={700}>{fmt(salary.baseSalary)}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Bonus</Typography>
          <Typography variant="body1" color="white">{fmt(salary.bonus)}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Total Comp</Typography>
          <Typography variant="body1" sx={{ color: '#4ade80' }} fontWeight={700}>{fmt(salary.totalCompensation)}</Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default function SalariesPage() {
  const [salaries, setSalaries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ companyId: '', jobTitle: '', location: '', experienceLevel: '' });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalElements: 0 });

  const fetchSalaries = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page: page - 1, size: 12 };
      if (filters.companyId) params.companyId = filters.companyId;
      if (filters.jobTitle) params.jobTitle = filters.jobTitle;
      if (filters.location) params.location = filters.location;
      if (filters.experienceLevel) params.experienceLevel = filters.experienceLevel;
      const res = await publicApi.getSalaries(params);
      const data = res.data.data;
      setSalaries(data.content);
      setPagination({ page, totalPages: data.totalPages, totalElements: data.totalElements });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchSalaries(1); }, [fetchSalaries]);

  useEffect(() => {
    publicApi.getCompanies({ size: 100 }).then(res => setCompanies(res.data.data.content));
  }, []);

  return (
    <Box sx={{ bgcolor: '#0f0f1a', minHeight: '100vh', color: 'white' }}>
      <Navbar />
      <Container sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Browse Salaries <Box component="span" sx={{ color: '#e94560' }}>({pagination.totalElements})</Box>
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 4, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select fullWidth label="Company"
                value={filters.companyId}
                onChange={e => setFilters(f => ({ ...f, companyId: e.target.value }))}
                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                InputProps={{ sx: { color: 'white' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }}
              >
                <MenuItem value="">All Companies</MenuItem>
                {companies.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth label="Job Title"
                value={filters.jobTitle}
                onChange={e => setFilters(f => ({ ...f, jobTitle: e.target.value }))}
                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                InputProps={{ sx: { color: 'white' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth label="Location"
                value={filters.location}
                onChange={e => setFilters(f => ({ ...f, location: e.target.value }))}
                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                InputProps={{ sx: { color: 'white' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select fullWidth label="Experience Level"
                value={filters.experienceLevel}
                onChange={e => setFilters(f => ({ ...f, experienceLevel: e.target.value }))}
                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.5)' } }}
                InputProps={{ sx: { color: 'white' } }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }}
              >
                <MenuItem value="">All Levels</MenuItem>
                {EXPERIENCE_LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <Box textAlign="center" py={8}><CircularProgress sx={{ color: '#e94560' }} /></Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {salaries.map(s => (
                <Grid item xs={12} md={6} lg={4} key={s.id}>
                  <SalaryCard salary={s} />
                </Grid>
              ))}
              {salaries.length === 0 && (
                <Grid item xs={12}>
                  <Typography textAlign="center" sx={{ color: 'rgba(255,255,255,0.5)', py: 8 }}>
                    No salaries found matching your filters.
                  </Typography>
                </Grid>
              )}
            </Grid>
            {pagination.totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={4}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.page}
                  onChange={(_, p) => fetchSalaries(p)}
                  sx={{ '& .MuiPaginationItem-root': { color: 'white' } }}
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Grid, Paper, TextField, MenuItem,
  Chip, CircularProgress, Pagination, Avatar
} from '@mui/material';
import { Business, Language } from '@mui/icons-material';
import Navbar from '../../components/shared/Navbar';
import { publicApi } from '../../services/api';

const STATUS_COLOR = { ACTIVE: '#4ade80', INACTIVE: '#f87171' };

function CompanyCard({ company }) {
  return (
    <Paper sx={{
      p: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)',
      transition: '0.2s', '&:hover': { borderColor: '#e94560', transform: 'translateY(-2px)' }
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar sx={{ bgcolor: '#0f3460', width: 48, height: 48 }}>
          {company.logoUrl ? <img src={company.logoUrl} alt="" width={48} /> : <Business />}
        </Avatar>
        <Box>
          <Typography variant="h6" color="white" fontWeight={700}>{company.name}</Typography>
          <Typography variant="body2" sx={{ color: '#e94560' }}>{company.industry}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {company.location && <Chip label={company.location} size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }} />}
        {company.companySize && <Chip label={company.companySize} size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }} />}
        {company.companyLevelCategory && <Chip label={company.companyLevelCategory} size="small"
          sx={{ bgcolor: 'rgba(15,52,96,0.5)', color: '#60a5fa' }} />}
      </Box>
      {company.website && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Language fontSize="small" sx={{ color: 'rgba(255,255,255,0.3)' }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            {company.website.replace(/https?:\/\//, '')}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const fetch = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page: page - 1, size: 12 };
      if (search) params.name = search;
      if (industry) params.industry = industry;
      const res = await publicApi.getCompanies(params);
      const d = res.data.data;
      setCompanies(d.content);
      setPagination({ page, totalPages: d.totalPages });
    } finally { setLoading(false); }
  }, [search, industry]);

  useEffect(() => { fetch(1); }, [fetch]);
  useEffect(() => {
    publicApi.getIndustries().then(res => setIndustries(res.data.data));
  }, []);

  const inputSx = {
    '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiInputBase-input': { color: 'white' },
  };

  return (
    <Box sx={{ bgcolor: '#0f0f1a', minHeight: '100vh', color: 'white' }}>
      <Navbar />
      <Container sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>Companies</Typography>

        <Paper sx={{ p: 3, mb: 4, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="Search by name" sx={inputSx}
                value={search} onChange={e => setSearch(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label="Industry" sx={inputSx}
                value={industry} onChange={e => setIndustry(e.target.value)}>
                <MenuItem value="">All Industries</MenuItem>
                {industries.map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <Box textAlign="center" py={8}><CircularProgress sx={{ color: '#e94560' }} /></Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {companies.map(c => (
                <Grid item xs={12} sm={6} md={4} key={c.id}>
                  <CompanyCard company={c} />
                </Grid>
              ))}
            </Grid>
            {pagination.totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={4}>
                <Pagination count={pagination.totalPages} page={pagination.page}
                  onChange={(_, p) => fetch(p)}
                  sx={{ '& .MuiPaginationItem-root': { color: 'white' } }} />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}

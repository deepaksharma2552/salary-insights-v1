import { useState, useEffect, useCallback } from 'react';
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { Business, HourglassEmpty, CheckCircle, Cancel, AccountTree } from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AiRefreshButton from '../../components/admin/AiRefreshButton';
import { adminApi } from '../../services/api';
import { format } from 'date-fns';

function StatCard({ icon, label, value, color = '#e94560' }) {
  return (
    <Paper sx={{ p: 3, bgcolor: '#1a1a2e', border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', gap: 3 }}>
      <Box sx={{ p: 1.5, bgcolor: `${color}22`, borderRadius: 2, color }}>{icon}</Box>
      <Box>
        <Typography variant="h4" fontWeight={700} color="white">{value?.toLocaleString?.() ?? value}</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>{label}</Typography>
      </Box>
    </Paper>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    adminApi.getDashboard().then(res => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) return (
    <Box sx={{ display: 'flex', bgcolor: '#0f0f1a', minHeight: '100vh' }}>
      <AdminSidebar />
      <Box flex={1} display="flex" alignItems="center" justifyContent="center">
        <CircularProgress sx={{ color: '#e94560' }} />
      </Box>
    </Box>
  );

  const trendData = data?.submissionTrend?.map(t => ({
    month: t.month ? format(new Date(t.month), 'MMM yy') : '',
    submissions: Number(t.count),
  })) || [];

  return (
    <Box sx={{ display: 'flex', bgcolor: '#0f0f1a', minHeight: '100vh', color: 'white' }}>
      <AdminSidebar />
      <Box flex={1} p={4} overflow="auto">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            Admin <Box component="span" sx={{ color: '#e94560' }}>Dashboard</Box>
          </Typography>
          <AiRefreshButton onComplete={loadDashboard} />
        </Box>

        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard icon={<Business />} label="Total Companies" value={data?.totalCompanies} color="#60a5fa" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard icon={<HourglassEmpty />} label="Pending Reviews" value={data?.pendingReviews} color="#fbbf24" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard icon={<AccountTree />} label="Level Mappings" value={data?.totalMappings} color="#a78bfa" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard icon={<CheckCircle />} label="Approved Salaries" value={data?.approvedEntries} color="#4ade80" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard icon={<Cancel />} label="Rejected Entries" value={data?.rejectedEntries} color="#f87171" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard icon={<Business />} label="Active Companies" value={data?.activeCompanies} color="#34d399" />
          </Grid>
        </Grid>

        <Paper sx={{ p: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Submission Trend (Last 12 Months)
          </Typography>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip contentStyle={{ backgroundColor: '#0f0f1a', border: '1px solid #e94560' }} />
                <Bar dataKey="submissions" fill="#e94560" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 4 }}>
              No submission data yet.
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

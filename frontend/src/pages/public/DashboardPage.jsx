import { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import Navbar from '../../components/shared/Navbar';
import { publicApi } from '../../services/api';

const COLORS = ['#e94560', '#0f3460', '#533483', '#05c46b', '#ffd460', '#1b9aaa', '#ef476f', '#06d6a0'];
const fmt = (n) => `$${(Number(n) / 1000).toFixed(0)}K`;

export default function DashboardPage() {
  const [levelData, setLevelData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [companyData, setCompanyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      publicApi.getAnalyticsByLevel(),
      publicApi.getAnalyticsByLocation(),
      publicApi.getAnalyticsByCompany(),
    ]).then(([l, loc, c]) => {
      setLevelData(l.data.data.map(d => ({
        name: d.groupKey,
        avgBase: Math.round(d.avgBaseSalary),
        avgTotal: Math.round(d.avgTotalCompensation),
        count: d.count,
      })));
      setLocationData(loc.data.data.slice(0, 8).map(d => ({
        name: d.groupKey?.split(',')[0] || d.groupKey,
        avgBase: Math.round(d.avgBaseSalary),
      })));
      setCompanyData(c.data.data.slice(0, 6).map(d => ({
        name: d.groupKey,
        value: Math.round(d.avgBaseSalary),
      })));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Box sx={{ bgcolor: '#0f0f1a', minHeight: '100vh' }}>
      <Navbar />
      <Box display="flex" justifyContent="center" pt={10}>
        <CircularProgress sx={{ color: '#e94560' }} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#0f0f1a', minHeight: '100vh', color: 'white' }}>
      <Navbar />
      <Container sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Salary <Box component="span" sx={{ color: '#e94560' }}>Analytics</Box>
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
          Aggregated salary insights across all approved submissions.
        </Typography>

        <Grid container spacing={4}>
          {/* Avg Salary by Standardized Level */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Average Salary by Standardized Level
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={levelData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                  <YAxis tickFormatter={fmt} stroke="rgba(255,255,255,0.5)" />
                  <Tooltip
                    formatter={(v) => [`$${v.toLocaleString()}`, '']}
                    contentStyle={{ bgcolor: '#0f0f1a', border: '1px solid #e94560' }}
                    labelStyle={{ color: 'white' }}
                  />
                  <Legend />
                  <Bar dataKey="avgBase" name="Avg Base Salary" fill="#e94560" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgTotal" name="Avg Total Comp" fill="#0f3460" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Salary by Location */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Average Salary by Location (Top 8)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={locationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tickFormatter={fmt} stroke="rgba(255,255,255,0.5)" />
                  <YAxis dataKey="name" type="category" width={120} stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v) => [`$${v.toLocaleString()}`]}
                    contentStyle={{ backgroundColor: '#0f0f1a', border: '1px solid #e94560' }}
                  />
                  <Bar dataKey="avgBase" name="Avg Base" fill="#05c46b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Salary by Company - Pie */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Avg Salary Share by Company
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={companyData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name }) => name.split(' ')[0]}
                    labelLine={false}
                  >
                    {companyData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`$${v.toLocaleString()}`]} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

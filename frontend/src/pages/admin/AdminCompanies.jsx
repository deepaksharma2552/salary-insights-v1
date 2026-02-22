import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Grid, IconButton
} from '@mui/material';
import { Add, Edit, Delete, ToggleOn, ToggleOff, AutoAwesome } from '@mui/icons-material';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AiRefreshButton from '../../components/admin/AiRefreshButton';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

const LEVEL_CATS = ['STARTUP', 'MID_SIZE', 'ENTERPRISE', 'CUSTOM'];
const cellSx = { color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const headSx = { color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 };

const EMPTY_FORM = { name: '', industry: '', location: '', companySize: '', companyLevelCategory: '', website: '', logoUrl: '' };

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(null); // null | 'create' | {company}
  const [form, setForm] = useState(EMPTY_FORM);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCompanies({ size: 100 });
      setCompanies(res.data.data.content);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setForm(EMPTY_FORM); setDialog('create'); };
  const openEdit = (c) => { setForm({ ...c }); setDialog(c); };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    try {
      if (dialog === 'create') {
        await adminApi.createCompany(form);
        toast.success('Company created!');
      } else {
        await adminApi.updateCompany(dialog.id, form);
        toast.success('Company updated!');
      }
      setDialog(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const toggle = async (id) => {
    try {
      await adminApi.toggleCompanyStatus(id);
      toast.success('Status toggled');
      fetch();
    } catch { toast.error('Failed'); }
  };

  const del = async (id) => {
    if (!confirm('Delete this company?')) return;
    try {
      await adminApi.deleteCompany(id);
      toast.success('Deleted');
      fetch();
    } catch { toast.error('Failed to delete'); }
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiInputBase-input': { color: 'white' },
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#0f0f1a', minHeight: '100vh', color: 'white' }}>
      <AdminSidebar />
      <Box flex={1} p={4} overflow="auto">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            Companies
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <AiRefreshButton label="Refresh All (AI)" onComplete={fetch} />
            <Button variant="contained" startIcon={<Add />} onClick={openCreate}
              sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73652' } }}>
              Add Company
            </Button>
          </Box>
        </Box>

        <Paper sx={{ bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
          {loading ? (
            <Box textAlign="center" p={8}><CircularProgress sx={{ color: '#e94560' }} /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {['Name', 'Industry', 'Location', 'Category', 'Status', 'Actions']
                      .map(h => <TableCell key={h} sx={headSx}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.map(c => (
                    <TableRow key={c.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{c.name}</TableCell>
                      <TableCell sx={cellSx}>{c.industry || '—'}</TableCell>
                      <TableCell sx={cellSx}>{c.location || '—'}</TableCell>
                      <TableCell sx={cellSx}>
                        {c.companyLevelCategory && (
                          <Chip label={c.companyLevelCategory} size="small"
                            sx={{ bgcolor: 'rgba(167,139,250,0.1)', color: '#a78bfa' }} />
                        )}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <Chip label={c.status} size="small"
                          sx={{ bgcolor: c.status === 'ACTIVE' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                            color: c.status === 'ACTIVE' ? '#4ade80' : '#f87171' }} />
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <AiRefreshButton
                            companyId={c.id}
                            variant="outlined"
                            size="small"
                            label="AI"
                            onComplete={fetch}
                          />
                          <IconButton size="small" sx={{ color: '#60a5fa' }} onClick={() => openEdit(c)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" sx={{ color: c.status === 'ACTIVE' ? '#4ade80' : '#f87171' }}
                            onClick={() => toggle(c.id)}>
                            {c.status === 'ACTIVE' ? <ToggleOn /> : <ToggleOff />}
                          </IconButton>
                          <IconButton size="small" sx={{ color: '#f87171' }} onClick={() => del(c.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#1a1a2e', color: 'white' } }}>
        <DialogTitle>{dialog === 'create' ? 'Add Company' : 'Edit Company'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {[
              { key: 'name', label: 'Company Name', required: true },
              { key: 'industry', label: 'Industry' },
              { key: 'location', label: 'Location' },
              { key: 'companySize', label: 'Company Size' },
              { key: 'website', label: 'Website' },
              { key: 'logoUrl', label: 'Logo URL' },
            ].map(({ key, label, required }) => (
              <Grid item xs={12} sm={6} key={key}>
                <TextField fullWidth label={label} required={required} sx={inputSx}
                  value={form[key] || ''} onChange={set(key)} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Level Category" sx={inputSx}
                value={form.companyLevelCategory || ''} onChange={set('companyLevelCategory')}>
                <MenuItem value="">None</MenuItem>
                {LEVEL_CATS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button onClick={save} variant="contained" sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73652' } }}>
            {dialog === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

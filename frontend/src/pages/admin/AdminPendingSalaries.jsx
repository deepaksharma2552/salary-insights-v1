import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Pagination
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';

const fmt = (n) => n ? `$${Number(n).toLocaleString()}` : '—';

const cellSx = { color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const headSx = { color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 };

export default function AdminPendingSalaries() {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getPendingSalaries({ page: p - 1, size: 10 });
      const d = res.data.data;
      setSalaries(d.content);
      setTotalPages(d.totalPages);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(page); }, [fetch, page]);

  const approve = async (id) => {
    try {
      await adminApi.approveSalary(id);
      toast.success('Salary approved!');
      fetch(page);
    } catch { toast.error('Failed to approve'); }
  };

  const reject = async () => {
    try {
      await adminApi.rejectSalary(rejectDialog, rejectReason);
      toast.success('Salary rejected');
      setRejectDialog(null);
      setRejectReason('');
      fetch(page);
    } catch { toast.error('Failed to reject'); }
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#0f0f1a', minHeight: '100vh', color: 'white' }}>
      <AdminSidebar />
      <Box flex={1} p={4} overflow="auto">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Pending <Box component="span" sx={{ color: '#e94560' }}>Reviews</Box>
        </Typography>

        <Paper sx={{ bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
          {loading ? (
            <Box textAlign="center" p={8}><CircularProgress sx={{ color: '#e94560' }} /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {['Company', 'Job Title', 'Level', 'Location', 'Base Salary', 'Total Comp', 'Submitted By', 'Actions']
                      .map(h => <TableCell key={h} sx={headSx}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ ...cellSx, textAlign: 'center', py: 6 }}>
                        No pending submissions 🎉
                      </TableCell>
                    </TableRow>
                  ) : salaries.map(s => (
                    <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell sx={cellSx}>{s.companyName}</TableCell>
                      <TableCell sx={cellSx}>{s.jobTitle}</TableCell>
                      <TableCell sx={cellSx}>
                        <Chip label={s.experienceLevel} size="small"
                          sx={{ bgcolor: 'rgba(233,69,96,0.15)', color: '#e94560' }} />
                        {s.standardizedLevelName && (
                          <Chip label={s.standardizedLevelName} size="small"
                            sx={{ ml: 0.5, bgcolor: 'rgba(96,165,250,0.1)', color: '#60a5fa' }} />
                        )}
                      </TableCell>
                      <TableCell sx={cellSx}>{s.location || '—'}</TableCell>
                      <TableCell sx={cellSx}>{fmt(s.baseSalary)}</TableCell>
                      <TableCell sx={{ ...cellSx, color: '#4ade80' }}>{fmt(s.totalCompensation)}</TableCell>
                      <TableCell sx={cellSx}>{s.submittedByEmail || '—'}</TableCell>
                      <TableCell sx={cellSx}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="contained"
                            sx={{ bgcolor: '#4ade80', color: '#000', '&:hover': { bgcolor: '#22c55e' }, minWidth: 0, px: 1 }}
                            onClick={() => approve(s.id)} startIcon={<CheckCircle fontSize="small" />}>
                            Approve
                          </Button>
                          <Button size="small" variant="outlined"
                            sx={{ borderColor: '#f87171', color: '#f87171', minWidth: 0, px: 1 }}
                            onClick={() => setRejectDialog(s.id)} startIcon={<Cancel fontSize="small" />}>
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)}
              sx={{ '& .MuiPaginationItem-root': { color: 'white' } }} />
          </Box>
        )}
      </Box>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onClose={() => setRejectDialog(null)}
        PaperProps={{ sx: { bgcolor: '#1a1a2e', color: 'white' } }}>
        <DialogTitle>Reject Salary Submission</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={3} label="Reason (optional)"
            value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            sx={{ mt: 1, '& .MuiInputBase-root': { color: 'white' },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
              '& .MuiOutlinedInput-root fieldset': { borderColor: 'rgba(255,255,255,0.15)' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(null)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button onClick={reject} variant="contained" sx={{ bgcolor: '#f87171', '&:hover': { bgcolor: '#ef4444' } }}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

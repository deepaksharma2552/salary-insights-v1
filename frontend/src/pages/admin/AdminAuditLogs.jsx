import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Chip, Pagination, MenuItem, TextField
} from '@mui/material';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { adminApi } from '../../services/api';
import { format } from 'date-fns';

const cellSx = { color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' };
const headSx = { color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600 };

const ACTION_COLORS = {
  CREATED: '#4ade80', UPDATED: '#60a5fa', DELETED: '#f87171',
  APPROVED: '#4ade80', REJECTED: '#f87171', MAPPED: '#a78bfa',
  STATUS_CHANGED: '#fbbf24', SUBMITTED: '#34d399',
};

const ENTITY_TYPES = ['Company', 'SalaryEntry', 'StandardizedLevel', 'CompanyLevel', 'LevelMapping'];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityType, setEntityType] = useState('');

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p - 1, size: 20 };
      if (entityType) params.entityType = entityType;
      const res = await adminApi.getAuditLogs(params);
      const d = res.data.data;
      setLogs(d.content);
      setTotalPages(d.totalPages);
    } finally { setLoading(false); }
  }, [entityType]);

  useEffect(() => { fetch(page); }, [fetch, page]);

  const inputSx = {
    '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
    '& .MuiInputBase-input': { color: 'white' },
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#0f0f1a', minHeight: '100vh', color: 'white' }}>
      <AdminSidebar />
      <Box flex={1} p={4} overflow="auto">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Audit <Box component="span" sx={{ color: '#e94560' }}>Logs</Box>
        </Typography>

        <Box sx={{ mb: 3 }}>
          <TextField select label="Filter by Entity Type" value={entityType}
            onChange={e => { setEntityType(e.target.value); setPage(1); }}
            size="small" sx={{ ...inputSx, minWidth: 220 }}>
            <MenuItem value="">All Types</MenuItem>
            {ENTITY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
        </Box>

        <Paper sx={{ bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
          {loading ? (
            <Box textAlign="center" p={8}><CircularProgress sx={{ color: '#e94560' }} /></Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {['Timestamp', 'Entity', 'Action', 'Performed By', 'Details']
                      .map(h => <TableCell key={h} sx={headSx}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ ...cellSx, textAlign: 'center', py: 6 }}>
                        No audit logs found.
                      </TableCell>
                    </TableRow>
                  ) : logs.map(log => (
                    <TableRow key={log.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell sx={{ ...cellSx, color: 'rgba(255,255,255,0.4)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {log.createdAt ? format(new Date(log.createdAt), 'MMM dd HH:mm:ss') : '—'}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <Chip label={log.entityType} size="small"
                          sx={{ bgcolor: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: 11 }} />
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <Chip label={log.action} size="small"
                          sx={{
                            bgcolor: `${ACTION_COLORS[log.action] || '#94a3b8'}22`,
                            color: ACTION_COLORS[log.action] || '#94a3b8',
                            fontWeight: 600, fontSize: 11
                          }} />
                      </TableCell>
                      <TableCell sx={{ ...cellSx, fontSize: 12 }}>{log.performedBy || 'system'}</TableCell>
                      <TableCell sx={{ ...cellSx, maxWidth: 300, fontSize: 12,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: 'rgba(255,255,255,0.5)' }}>
                        {log.details}
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
            <Pagination count={totalPages} page={page} onChange={(_, p) => { setPage(p); fetch(p); }}
              sx={{ '& .MuiPaginationItem-root': { color: 'white' } }} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

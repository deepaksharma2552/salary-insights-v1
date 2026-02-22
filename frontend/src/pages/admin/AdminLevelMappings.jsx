import { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Grid, Button, Chip, MenuItem, Select, FormControl,
  InputLabel, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Alert
} from '@mui/material';
import { Add, Delete, Link as LinkIcon, LinkOff } from '@mui/icons-material';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { adminApi, publicApi } from '../../services/api';
import toast from 'react-hot-toast';

const inputSx = {
  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
  '& .MuiInputBase-input': { color: 'white' },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.5)' },
};

export default function AdminLevelMappings() {
  const [standardizedLevels, setStandardizedLevels] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyLevels, setCompanyLevels] = useState([]);
  const [newLevelName, setNewLevelName] = useState('');
  const [newStdLevel, setNewStdLevel] = useState({});
  const [stdDialog, setStdDialog] = useState(false);
  const [stdForm, setStdForm] = useState({ name: '', hierarchyRank: '' });

  useEffect(() => {
    adminApi.getStandardizedLevels().then(res => setStandardizedLevels(res.data.data));
    publicApi.getCompanies({ size: 200 }).then(res => setCompanies(res.data.data.content));
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      adminApi.getCompanyLevels(selectedCompany).then(res => setCompanyLevels(res.data.data));
    }
  }, [selectedCompany]);

  const addCompanyLevel = async () => {
    if (!newLevelName.trim() || !selectedCompany) return;
    try {
      await adminApi.createCompanyLevel({ companyId: selectedCompany, internalLevelName: newLevelName });
      toast.success('Level added!');
      setNewLevelName('');
      adminApi.getCompanyLevels(selectedCompany).then(res => setCompanyLevels(res.data.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteCompanyLevel = async (id) => {
    try {
      await adminApi.deleteCompanyLevel(id);
      toast.success('Deleted');
      adminApi.getCompanyLevels(selectedCompany).then(res => setCompanyLevels(res.data.data));
    } catch { toast.error('Failed'); }
  };

  const saveMapping = async (companyLevelId) => {
    const stdId = newStdLevel[companyLevelId];
    if (!stdId) return toast.error('Select a standardized level first');
    try {
      await adminApi.createMapping({ companyLevelId, standardizedLevelId: stdId });
      toast.success('Mapping saved!');
      adminApi.getCompanyLevels(selectedCompany).then(res => setCompanyLevels(res.data.data));
    } catch { toast.error('Failed to save mapping'); }
  };

  const deleteMapping = async (companyLevelId) => {
    try {
      await adminApi.deleteMapping(companyLevelId);
      toast.success('Mapping removed');
      adminApi.getCompanyLevels(selectedCompany).then(res => setCompanyLevels(res.data.data));
    } catch { toast.error('Failed'); }
  };

  const createStdLevel = async () => {
    try {
      await adminApi.createStandardizedLevel({ name: stdForm.name, hierarchyRank: Number(stdForm.hierarchyRank) });
      toast.success('Created!');
      setStdDialog(false);
      setStdForm({ name: '', hierarchyRank: '' });
      adminApi.getStandardizedLevels().then(res => setStandardizedLevels(res.data.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const deleteStdLevel = async (id) => {
    try {
      await adminApi.deleteStandardizedLevel(id);
      toast.success('Deleted');
      adminApi.getStandardizedLevels().then(res => setStandardizedLevels(res.data.data));
    } catch { toast.error('Failed'); }
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#0f0f1a', minHeight: '100vh', color: 'white' }}>
      <AdminSidebar />
      <Box flex={1} p={4} overflow="auto">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Level <Box component="span" sx={{ color: '#e94560' }}>Mapping System</Box>
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 4 }}>
          Map company-specific internal levels (e.g. L4, SDE-II) to standardized levels for cross-company analysis.
        </Typography>

        <Grid container spacing={4}>
          {/* Standardized Levels Panel */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>Standardized Levels</Typography>
                <Button size="small" startIcon={<Add />} onClick={() => setStdDialog(true)}
                  sx={{ color: '#e94560', borderColor: '#e94560' }} variant="outlined">
                  Add
                </Button>
              </Box>
              <List dense>
                {standardizedLevels.sort((a, b) => a.hierarchyRank - b.hierarchyRank).map(l => (
                  <ListItem key={l.id} sx={{ px: 0 }}>
                    <Chip label={`#${l.hierarchyRank}`} size="small"
                      sx={{ mr: 1, bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', minWidth: 36 }} />
                    <ListItemText
                      primary={l.name}
                      primaryTypographyProps={{ color: 'white', fontWeight: 600 }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton size="small" sx={{ color: '#f87171' }} onClick={() => deleteStdLevel(l.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Company Level Mappings */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Company Level Mappings</Typography>

              <FormControl fullWidth sx={{ ...inputSx, mb: 3 }}>
                <InputLabel>Select Company</InputLabel>
                <Select
                  value={selectedCompany}
                  onChange={e => setSelectedCompany(e.target.value)}
                  label="Select Company"
                  sx={{ color: 'white' }}
                >
                  {companies.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>

              {selectedCompany && (
                <>
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <TextField
                      flex={1} fullWidth label="New Internal Level Name (e.g. L4, SDE-II)"
                      value={newLevelName} onChange={e => setNewLevelName(e.target.value)}
                      sx={inputSx} size="small"
                    />
                    <Button variant="contained" onClick={addCompanyLevel}
                      sx={{ bgcolor: '#e94560', '&:hover': { bgcolor: '#c73652' }, whiteSpace: 'nowrap' }}>
                      Add Level
                    </Button>
                  </Box>

                  {companyLevels.length === 0 ? (
                    <Alert severity="info" sx={{ bgcolor: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                      No levels yet. Add company-specific levels above.
                    </Alert>
                  ) : (
                    <List>
                      {companyLevels.map(cl => (
                        <Box key={cl.id}>
                          <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography fontWeight={700} color="white" mb={1}>
                                {cl.internalLevelName}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                {cl.standardizedLevelName ? (
                                  <Chip
                                    icon={<LinkIcon fontSize="small" />}
                                    label={`→ ${cl.standardizedLevelName} (Rank ${cl.hierarchyRank})`}
                                    sx={{ bgcolor: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
                                    onDelete={() => deleteMapping(cl.id)}
                                    deleteIcon={<LinkOff sx={{ color: '#f87171 !important' }} />}
                                  />
                                ) : (
                                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Select
                                      size="small" displayEmpty
                                      value={newStdLevel[cl.id] || ''}
                                      onChange={e => setNewStdLevel(m => ({ ...m, [cl.id]: e.target.value }))}
                                      sx={{ color: 'white', minWidth: 160,
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' } }}
                                    >
                                      <MenuItem value="" disabled>Map to level...</MenuItem>
                                      {standardizedLevels.map(sl => (
                                        <MenuItem key={sl.id} value={sl.id}>{sl.name} (#{sl.hierarchyRank})</MenuItem>
                                      ))}
                                    </Select>
                                    <Button size="small" variant="outlined"
                                      sx={{ borderColor: '#60a5fa', color: '#60a5fa' }}
                                      onClick={() => saveMapping(cl.id)}>
                                      Map
                                    </Button>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                            <IconButton size="small" sx={{ color: '#f87171', mt: 0.5 }}
                              onClick={() => deleteCompanyLevel(cl.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </ListItem>
                          <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                        </Box>
                      ))}
                    </List>
                  )}
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Create Standardized Level Dialog */}
      <Dialog open={stdDialog} onClose={() => setStdDialog(false)}
        PaperProps={{ sx: { bgcolor: '#1a1a2e', color: 'white' } }}>
        <DialogTitle>Add Standardized Level</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name (e.g. Senior)" sx={{ ...inputSx, mt: 1, mb: 2 }}
            value={stdForm.name} onChange={e => setStdForm(f => ({ ...f, name: e.target.value }))} />
          <TextField fullWidth label="Hierarchy Rank (1=lowest)" type="number" sx={inputSx}
            value={stdForm.hierarchyRank} onChange={e => setStdForm(f => ({ ...f, hierarchyRank: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStdDialog(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Button>
          <Button onClick={createStdLevel} variant="contained" sx={{ bgcolor: '#e94560' }}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

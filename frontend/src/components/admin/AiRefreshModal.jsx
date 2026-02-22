import { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, CircularProgress,
  Chip, Divider, LinearProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Collapse, IconButton,
  Alert, Tooltip
} from '@mui/material';
import {
  AutoAwesome, CheckCircle, Error, ExpandMore, ExpandLess,
  TrendingUp, Lightbulb, Business, Timeline
} from '@mui/icons-material';

const STATUS_CONFIG = {
  SUCCESS:  { color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  icon: <CheckCircle /> },
  PARTIAL:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', icon: <Timeline /> },
  FAILED:   { color: '#f87171', bg: 'rgba(248,113,113,0.08)', icon: <Error /> },
};

function StatBadge({ value, label, color = '#e94560', icon }) {
  return (
    <Box sx={{
      textAlign: 'center', p: 2,
      bgcolor: `${color}10`, borderRadius: 2,
      border: `1px solid ${color}30`,
      flex: 1, minWidth: 100,
    }}>
      <Box sx={{ color, mb: 0.5, display: 'flex', justifyContent: 'center' }}>{icon}</Box>
      <Typography variant="h4" fontWeight={800} sx={{ color }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', lineHeight: 1.2 }}>
        {label}
      </Typography>
    </Box>
  );
}

function CompanyResultRow({ row }) {
  const ok = row.status === 'SUCCESS';
  return (
    <TableRow sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.06)', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Business fontSize="small" sx={{ color: 'rgba(255,255,255,0.3)' }} />
          {row.companyName}
        </Box>
      </TableCell>
      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)', py: 1 }}>
        <Chip label={row.status} size="small"
          sx={{ bgcolor: ok ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                color: ok ? '#4ade80' : '#f87171', fontWeight: 700 }} />
      </TableCell>
      <TableCell align="right" sx={{ color: '#4ade80', fontWeight: 700, borderColor: 'rgba(255,255,255,0.06)', py: 1 }}>
        +{row.newSalaries}
      </TableCell>
      <TableCell align="right" sx={{ color: '#a78bfa', borderColor: 'rgba(255,255,255,0.06)', py: 1 }}>
        {row.newLevels}
      </TableCell>
      {row.error && (
        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.06)', py: 1 }}>
          <Tooltip title={row.error}>
            <Typography variant="caption" sx={{ color: '#f87171', cursor: 'help' }}>
              {row.error.slice(0, 40)}…
            </Typography>
          </Tooltip>
        </TableCell>
      )}
    </TableRow>
  );
}

function MappingSuggestionRow({ s }) {
  const confColor = s.confidence >= 0.8 ? '#4ade80' : s.confidence >= 0.6 ? '#fbbf24' : '#f87171';
  return (
    <Box sx={{
      p: 2, mb: 1, borderRadius: 2,
      bgcolor: 'rgba(167,139,250,0.05)',
      border: '1px solid rgba(167,139,250,0.15)'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="body2" fontWeight={700} color="white">{s.companyName}</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>·</Typography>
        <Chip label={s.internalLevelName} size="small"
          sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'white', fontFamily: 'monospace' }} />
        <Typography sx={{ color: 'rgba(255,255,255,0.4)', mx: 0.5 }}>→</Typography>
        <Chip label={s.suggestedStandardizedLevel} size="small"
          sx={{ bgcolor: 'rgba(167,139,250,0.15)', color: '#a78bfa', fontWeight: 700 }} />
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: confColor, fontWeight: 700 }}>
            {Math.round(s.confidence * 100)}% confidence
          </Typography>
          <LinearProgress variant="determinate" value={s.confidence * 100}
            sx={{ width: 60, height: 4, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: confColor } }} />
        </Box>
      </Box>
      {s.reasoning && (
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
          {s.reasoning}
        </Typography>
      )}
    </Box>
  );
}

/**
 * AiRefreshModal
 * Props:
 *   open: boolean
 *   loading: boolean
 *   result: AiRefreshResult | null
 *   error: string | null
 *   onClose: () => void
 */
export default function AiRefreshModal({ open, loading, result, error, onClose }) {
  const [showCompanies, setShowCompanies] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const cfg = result ? (STATUS_CONFIG[result.status] ?? STATUS_CONFIG.SUCCESS) : null;

  return (
    <Dialog open={open} onClose={!loading ? onClose : undefined}
      maxWidth="md" fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#0f0f1a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 3,
          backgroundImage: 'radial-gradient(ellipse at 60% -10%, rgba(233,69,96,0.08) 0%, transparent 60%)',
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>

        {/* ── Header ── */}
        <Box sx={{
          px: 4, pt: 4, pb: 2,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 2
        }}>
          <Box sx={{
            p: 1.5, borderRadius: 2,
            background: 'linear-gradient(135deg, #e94560, #9333ea)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AutoAwesome sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} color="white" sx={{ lineHeight: 1 }}>
              AI Refresh Latest Data
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              Powered by Claude — fetches & normalizes public salary intelligence
            </Typography>
          </Box>
        </Box>

        <Box sx={{ px: 4, py: 3 }}>

          {/* ── Loading State ── */}
          {loading && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
                <CircularProgress size={72} thickness={2}
                  sx={{ color: '#e94560' }} />
                <Box sx={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <AutoAwesome sx={{ color: '#e94560', fontSize: 28 }} />
                </Box>
              </Box>
              <Typography variant="h6" color="white" fontWeight={700} gutterBottom>
                AI is analyzing salary data…
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', maxWidth: 380, mx: 'auto' }}>
                Querying Claude for each company's latest salary ranges, detecting new
                levels, and generating mapping suggestions.
              </Typography>
              <LinearProgress sx={{
                mt: 4, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.06)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #e94560, #9333ea)',
                }
              }} />
            </Box>
          )}

          {/* ── Error State ── */}
          {!loading && error && (
            <Alert severity="error"
              sx={{ bgcolor: 'rgba(248,113,113,0.08)', color: '#f87171',
                    border: '1px solid rgba(248,113,113,0.2)', borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* ── Result State ── */}
          {!loading && result && (
            <>
              {/* Status Banner */}
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 2, p: 2,
                borderRadius: 2, mb: 3,
                bgcolor: cfg.bg, border: `1px solid ${cfg.color}30`
              }}>
                <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} sx={{ color: cfg.color }}>{result.status}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    {result.message}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                  {result.durationMs ? `${(result.durationMs / 1000).toFixed(1)}s` : ''}
                </Typography>
              </Box>

              {/* Stats Row */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <StatBadge value={result.companiesProcessed} label="Companies" color="#60a5fa"
                  icon={<Business fontSize="small" />} />
                <StatBadge value={`+${result.newSalariesAdded}`} label="Salaries Added" color="#4ade80"
                  icon={<TrendingUp fontSize="small" />} />
                <StatBadge value={result.levelsDetected} label="New Levels" color="#a78bfa"
                  icon={<AutoAwesome fontSize="small" />} />
                <StatBadge value={result.mappingSuggestions} label="Map Suggestions" color="#fbbf24"
                  icon={<Lightbulb fontSize="small" />} />
              </Box>

              {/* Per-Company Breakdown */}
              {result.companyResults?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      COMPANY BREAKDOWN
                    </Typography>
                    <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)' }}
                      onClick={() => setShowCompanies(v => !v)}>
                      {showCompanies ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  <Collapse in={showCompanies}>
                    <TableContainer sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Company', 'Status', 'New Salaries', 'New Levels'].map(h => (
                              <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.35)',
                                borderColor: 'rgba(255,255,255,0.06)', fontWeight: 600, fontSize: 11 }}>
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {result.companyResults.map((row, i) => (
                            <CompanyResultRow key={i} row={row} />
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Box>
              )}

              {/* Mapping Suggestions */}
              {result.mappingSuggestionList?.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                      AI MAPPING SUGGESTIONS{' '}
                      <Typography component="span" variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                        (apply these in the Level Mappings page)
                      </Typography>
                    </Typography>
                    <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)' }}
                      onClick={() => setShowSuggestions(v => !v)}>
                      {showSuggestions ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  <Collapse in={showSuggestions}>
                    {result.mappingSuggestionList.map((s, i) => (
                      <MappingSuggestionRow key={i} s={s} />
                    ))}
                  </Collapse>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* ── Footer ── */}
        {!loading && (
          <Box sx={{
            px: 4, py: 2, borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'flex-end'
          }}>
            <Box
              component="button"
              onClick={onClose}
              sx={{
                px: 3, py: 1, borderRadius: 2, border: 'none', cursor: 'pointer',
                bgcolor: 'rgba(255,255,255,0.06)', color: 'white',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                transition: '0.15s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              Close
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

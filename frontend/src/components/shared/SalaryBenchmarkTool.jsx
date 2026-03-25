import { useState, useCallback } from 'react';
import api from '../../services/api';
import { useLocations } from '../../hooks/useLocations';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (val) => {
  if (!val && val !== 0) return null;
  const n = Number(val);
  if (isNaN(n)) return null;
  const l = n / 100_000;
  return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
};

const EXP_LEVELS = [
  { value: '',       label: 'Any level'  },
  { value: 'ENTRY',  label: 'Junior'     },
  { value: 'MID',    label: 'Mid-level'  },
  { value: 'SENIOR', label: 'Senior'     },
  { value: 'LEAD',   label: 'Lead / Staff' },
];

// Returns a CSS color and label for the trend relative to median
function offerPosition(offerVal, p25, p50, p75) {
  if (!offerVal || !p50) return null;
  const v = Number(offerVal);
  if (v >= Number(p75))  return { color: 'var(--green)',    label: 'Above 75th percentile', pct: 100 };
  if (v >= Number(p50))  return { color: 'var(--viz-1)',    label: 'Above median', pct: 75 };
  if (v >= Number(p25))  return { color: 'var(--viz-2)',    label: 'Below median', pct: 40 };
  return                          { color: 'var(--rose)',    label: 'Below 25th percentile', pct: 15 };
}

// ── Percentile Bar ────────────────────────────────────────────────────────────
function PercentileBar({ p25, p50, p75, avg, userVal, label }) {
  const max = Math.max(Number(p75) * 1.2, Number(userVal ?? 0) * 1.1);
  const pct = (v) => Math.min(100, (Number(v) / max) * 100);
  const pos = userVal ? offerPosition(userVal, p25, p50, p75) : null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
        {pos && (
          <span style={{ fontSize: 11, color: pos.color, fontWeight: 600, background: `${pos.color}18`, padding: '2px 8px', borderRadius: 20 }}>
            {pos.label}
          </span>
        )}
      </div>

      {/* Track */}
      <div style={{ position: 'relative', height: 10, background: 'var(--bg-3)', borderRadius: 99, overflow: 'visible' }}>

        {/* P25–P75 fill (interquartile range) */}
        <div style={{
          position: 'absolute',
          left: `${pct(p25)}%`,
          width: `${pct(p75) - pct(p25)}%`,
          height: '100%',
          background: 'var(--viz-1-dim)',
          borderRadius: 99,
        }} />

        {/* P50 median tick */}
        <div style={{
          position: 'absolute',
          left: `${pct(p50)}%`,
          transform: 'translateX(-50%)',
          width: 2,
          height: 18,
          top: -4,
          background: 'var(--viz-1)',
          borderRadius: 2,
        }} />

        {/* User offer marker */}
        {userVal && (
          <div style={{
            position: 'absolute',
            left: `${pct(userVal)}%`,
            transform: 'translateX(-50%)',
            width: 14,
            height: 14,
            top: -2,
            background: pos?.color ?? 'var(--text-1)',
            border: '2px solid var(--panel)',
            borderRadius: '50%',
            boxShadow: '0 0 0 2px ' + (pos?.color ?? 'var(--text-1)') + '44',
            zIndex: 2,
          }} />
        )}
      </div>

      {/* Labels below track */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
        <span>P25 {fmt(p25)}</span>
        <span style={{ color: 'var(--viz-1)', fontWeight: 600 }}>Median {fmt(p50)}</span>
        <span>P75 {fmt(p75)}</span>
      </div>

      {avg && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, fontFamily: "'IBM Plex Mono',monospace" }}>
          Market avg: <span style={{ color: 'var(--text-2)' }}>{fmt(avg)}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SalaryBenchmarkTool() {
  const { locations } = useLocations();
  const [jobTitle,  setJobTitle]  = useState('');
  const [expLevel,  setExpLevel]  = useState('');
  const [location,  setLocation]  = useState('');
  const [offerTc,   setOfferTc]   = useState('');
  const [offerBase, setOfferBase] = useState('');

  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const canSubmit = jobTitle.trim().length >= 2;

  const handleBenchmark = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = { jobTitle: jobTitle.trim() };
      if (expLevel) params.expLevel = expLevel;
      if (location) params.location = location;
      const res = await api.get('/public/salaries/benchmark', { params });
      setResult(res.data?.data ?? null);
    } catch (e) {
      setError('Failed to load benchmark data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [jobTitle, expLevel, location, canSubmit]);

  // Parse lakhs input → raw number
  const parseInput = (v) => {
    if (!v) return null;
    const n = parseFloat(v.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n * 100_000;
  };

  const offerTcRaw   = parseInput(offerTc);
  const offerBaseRaw = parseInput(offerBase);

  return (
    <div style={{ maxWidth: 680, marginTop: 8 }}>

      {/* ── Input card ── */}
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 20,
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
            Role / Job title <span style={{ color: 'var(--rose)' }}>*</span>
          </div>
          <input
            className="input-field"
            type="text"
            placeholder="e.g. Software Engineer, Product Manager…"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canSubmit && handleBenchmark()}
            style={{ width: '100%', marginBottom: 0 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Experience level</div>
            <select
              value={expLevel}
              onChange={e => setExpLevel(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 9,
                border: '1px solid var(--border)', background: 'var(--bg-2)',
                color: 'var(--text-1)', fontSize: 13, cursor: 'pointer',
              }}
            >
              {EXP_LEVELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Location</div>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 9,
                border: '1px solid var(--border)', background: 'var(--bg-2)',
                color: 'var(--text-1)', fontSize: 13, cursor: 'pointer',
              }}
            >
              <option value="">All locations</option>
              {locations.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {/* Optional: your offer */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
            Optional — enter your offer to see where you stand
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Total comp (₹ lakhs/yr)</div>
              <input
                className="input-field"
                type="number"
                placeholder="e.g. 25"
                value={offerTc}
                onChange={e => setOfferTc(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Base salary (₹ lakhs/yr)</div>
              <input
                className="input-field"
                type="number"
                placeholder="e.g. 18"
                value={offerBase}
                onChange={e => setOfferBase(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleBenchmark}
          disabled={!canSubmit || loading}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
            background: canSubmit ? 'var(--viz-1)' : 'var(--bg-4)',
            color: canSubmit ? '#fff' : 'var(--text-3)',
            fontSize: 14, fontWeight: 600, cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s, opacity 0.15s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Fetching market data…' : '📊 Benchmark this role'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--rose-dim)', border: '1px solid #fecdd3', borderRadius: 10, color: 'var(--rose)', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Result card ── */}
      {result && (
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '24px 28px',
          animation: 'fadeUp 0.25s ease',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                {result.role}
                {result.experienceLevel && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', marginLeft: 8, verticalAlign: 'middle' }}>
                    · {EXP_LEVELS.find(e => e.value === result.experienceLevel)?.label ?? result.experienceLevel}
                  </span>
                )}
              </div>
              {result.location && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>📍 {result.location}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                {result.sampleSize} {result.sampleSize === 1 ? 'entry' : 'entries'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>sample size</div>
            </div>
          </div>

          {/* Broadening notice */}
          {result.broadened && result.broadeningReason && (
            <div style={{
              background: 'var(--viz-2-dim)', border: '1px solid #ddd6fe',
              borderRadius: 8, padding: '8px 12px', fontSize: 12,
              color: 'var(--viz-2)', marginBottom: 20,
            }}>
              ℹ️ {result.broadeningReason} — results reflect a broader market
            </div>
          )}

          {result.sampleSize === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 14 }}>
              No matching salary data found. Try a broader search.
            </div>
          ) : (
            <>
              {/* TC percentile bar */}
              {result.p50Tc && (
                <PercentileBar
                  label="Total Compensation"
                  p25={result.p25Tc}
                  p50={result.p50Tc}
                  p75={result.p75Tc}
                  avg={result.avgTc}
                  userVal={offerTcRaw}
                />
              )}

              {/* Base percentile bar */}
              {result.p50Base && (
                <PercentileBar
                  label="Base Salary"
                  p25={result.p25Base}
                  p50={result.p50Base}
                  p75={result.p75Base ?? result.p75Tc}
                  avg={result.avgBase}
                  userVal={offerBaseRaw}
                />
              )}

              {/* Avg breakdown */}
              {(result.avgBonus || result.avgEquity) && (
                <div style={{
                  display: 'flex', gap: 16, marginTop: 4,
                  paddingTop: 16, borderTop: '1px solid var(--border)',
                  flexWrap: 'wrap',
                }}>
                  {[
                    { label: 'Avg Bonus',  val: result.avgBonus,  color: 'var(--viz-2)' },
                    { label: 'Avg Equity', val: result.avgEquity, color: 'var(--viz-3)' },
                    { label: 'Avg Total',  val: result.avgTc,     color: 'var(--viz-1)' },
                  ].map(({ label, val, color }) => val && (
                    <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '10px 14px', flex: '1 1 100px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 700, color }}>{fmt(val)}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { useLocations } from '../../hooks/useLocations';
import { useAppData } from '../../context/AppDataContext';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (val) => {
  if (!val && val !== 0) return null;
  const n = Number(val);
  if (isNaN(n)) return null;
  const l = n / 100_000;
  return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
};

function offerPosition(offerVal, p25, p50, p75) {
  if (!offerVal || !p50) return null;
  const v = Number(offerVal);
  if (v >= Number(p75))  return { color: 'var(--green)',  label: 'Above 75th percentile' };
  if (v >= Number(p50))  return { color: 'var(--viz-1)',  label: 'Above median'           };
  if (v >= Number(p25))  return { color: 'var(--viz-2)',  label: 'Below median'           };
  return                          { color: 'var(--rose)',  label: 'Below 25th percentile'  };
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
      <div style={{ position: 'relative', height: 10, background: 'var(--bg-3)', borderRadius: 99, overflow: 'visible' }}>
        <div style={{ position: 'absolute', left: `${pct(p25)}%`, width: `${pct(p75) - pct(p25)}%`, height: '100%', background: 'var(--viz-1-dim)', borderRadius: 99 }} />
        <div style={{ position: 'absolute', left: `${pct(p50)}%`, transform: 'translateX(-50%)', width: 2, height: 18, top: -4, background: 'var(--viz-1)', borderRadius: 2 }} />
        {userVal && (
          <div style={{ position: 'absolute', left: `${pct(userVal)}%`, transform: 'translateX(-50%)', width: 14, height: 14, top: -2, background: pos?.color ?? 'var(--text-1)', border: '2px solid var(--panel)', borderRadius: '50%', boxShadow: '0 0 0 2px ' + (pos?.color ?? 'var(--text-1)') + '44', zIndex: 2 }} />
        )}
      </div>
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

// ── Equity Comparison Row ─────────────────────────────────────────────────────
function EquityRow({ userEquity, avgEquity }) {
  if (!avgEquity) return null;
  const avg = Number(avgEquity);
  const user = Number(userEquity);
  const hasUser = userEquity && !isNaN(user) && user > 0;

  let badge = null;
  if (hasUser) {
    const diff = ((user - avg) / avg) * 100;
    if (diff >= 10)       badge = { label: `+${diff.toFixed(0)}% above avg`, color: 'var(--green)' };
    else if (diff >= -10) badge = { label: 'Near market avg',                color: 'var(--viz-1)' };
    else                  badge = { label: `${diff.toFixed(0)}% below avg`,  color: 'var(--rose)'  };
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 3 }}>Equity / RSU</div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
          Market avg: <span style={{ color: 'var(--text-2)' }}>{fmt(avg)}</span>
          {hasUser && <> · Your offer: <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{fmt(user)}</span></>}
        </div>
      </div>
      {badge && (
        <span style={{ fontSize: 11, fontWeight: 600, color: badge.color, background: `${badge.color}18`, padding: '3px 10px', borderRadius: 20 }}>
          {badge.label}
        </span>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SalaryBenchmarkTool() {
  const { locations } = useLocations();
  const { functions, getLevelsForFunction, functionsReady } = useAppData();

  const [jobTitle,        setJobTitle]        = useState('');
  const [jobFunctionId,   setJobFunctionId]   = useState('');
  const [functionLevelId, setFunctionLevelId] = useState('');
  const [location,        setLocation]        = useState('');
  const [offerTc,         setOfferTc]         = useState('');
  const [offerBase,       setOfferBase]       = useState('');
  const [offerEquity,     setOfferEquity]     = useState('');

  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Levels reactive to selected function — mirrors SubmitSalaryPage pattern
  const availableLevels = useMemo(
    () => getLevelsForFunction(jobFunctionId),
    [jobFunctionId, getLevelsForFunction]
  );

  function handleFunctionChange(e) {
    setJobFunctionId(e.target.value);
    setFunctionLevelId(''); // reset level when function changes
  }

  const canSubmit = jobTitle.trim().length >= 2 || !!jobFunctionId;

  const handleBenchmark = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = {};
      if (jobTitle.trim())   params.jobTitle        = jobTitle.trim();
      if (jobFunctionId)     params.jobFunctionId   = jobFunctionId;
      if (functionLevelId)   params.functionLevelId = functionLevelId;
      if (location)          params.location        = location;
      const res = await api.get('/public/salaries/benchmark', { params });
      setResult(res.data?.data ?? null);
    } catch {
      setError('Failed to load benchmark data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [jobTitle, jobFunctionId, functionLevelId, location, canSubmit]);

  const parseInput = (v) => {
    if (!v) return null;
    const n = parseFloat(v.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n * 100_000;
  };

  const offerTcRaw     = parseInput(offerTc);
  const offerBaseRaw   = parseInput(offerBase);
  const offerEquityRaw = parseInput(offerEquity);

  const selectStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 9,
    border: '1px solid var(--border)', background: 'var(--bg-2)',
    color: 'var(--text-1)', fontSize: 13, cursor: 'pointer',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 };

  return (
    <div style={{ maxWidth: 680, marginTop: 8 }}>

      {/* ── Input card ── */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>

        {/* Job Title */}
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Role / Job title</div>
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

        {/* Function + Level — same hierarchy as Share Salary page */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={labelStyle}>Function</div>
            <select value={jobFunctionId} onChange={handleFunctionChange} style={selectStyle} disabled={!functionsReady}>
              <option value="">{functionsReady ? 'Any function' : 'Loading…'}</option>
              {functions.map(fn => <option key={fn.id} value={fn.id}>{fn.displayName}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Level</div>
            <select
              value={functionLevelId}
              onChange={e => setFunctionLevelId(e.target.value)}
              style={{ ...selectStyle, opacity: jobFunctionId ? 1 : 0.55 }}
              disabled={!jobFunctionId}
            >
              <option value="">{jobFunctionId ? 'Any level' : 'Select a function first'}</option>
              {availableLevels.map(lv => <option key={lv.id} value={lv.id}>{lv.name}</option>)}
            </select>
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 20 }}>
          <div style={labelStyle}>Location</div>
          <select value={location} onChange={e => setLocation(e.target.value)} style={selectStyle}>
            <option value="">All locations</option>
            {locations.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        {/* Optional offer inputs */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
            Optional — enter your offer to see where you stand
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={labelStyle}>Total comp (₹L/yr)</div>
              <input className="input-field" type="number" placeholder="e.g. 25" value={offerTc} onChange={e => setOfferTc(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={labelStyle}>Base salary (₹L/yr)</div>
              <input className="input-field" type="number" placeholder="e.g. 18" value={offerBase} onChange={e => setOfferBase(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <div style={labelStyle}>Equity / RSU (₹L/yr)</div>
              <input className="input-field" type="number" placeholder="e.g. 5" value={offerEquity} onChange={e => setOfferEquity(e.target.value)} style={{ width: '100%' }} />
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
            fontSize: 14, fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1, transition: 'background 0.15s, opacity 0.15s',
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
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', animation: 'fadeUp 0.25s ease' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                {result.role ?? 'All roles'}
                {result.jobFunction && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', marginLeft: 8, verticalAlign: 'middle' }}>
                    · {result.jobFunction}
                  </span>
                )}
                {result.level && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', marginLeft: 4, verticalAlign: 'middle' }}>
                    / {result.level}
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
            <div style={{ background: 'var(--viz-2-dim)', border: '1px solid #ddd6fe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--viz-2)', marginBottom: 20 }}>
              ℹ️ {result.broadeningReason} — results reflect a broader market
            </div>
          )}

          {result.sampleSize === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 14 }}>
              No matching salary data found. Try a broader search.
            </div>
          ) : (
            <>
              {result.p50Tc && (
                <PercentileBar label="Total Compensation" p25={result.p25Tc} p50={result.p50Tc} p75={result.p75Tc} avg={result.avgTc} userVal={offerTcRaw} />
              )}
              {result.p50Base && (
                <PercentileBar label="Base Salary" p25={result.p25Base} p50={result.p50Base} p75={result.p75Base ?? result.p75Tc} avg={result.avgBase} userVal={offerBaseRaw} />
              )}
              {result.avgEquity && (
                <EquityRow userEquity={offerEquityRaw} avgEquity={result.avgEquity} />
              )}
              {(result.avgBonus || result.avgEquity) && (
                <div style={{ display: 'flex', gap: 16, marginTop: 4, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
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

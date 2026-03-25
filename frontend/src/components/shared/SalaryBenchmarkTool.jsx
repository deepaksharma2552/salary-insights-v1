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
  if (v >= Number(p75)) return { color: 'var(--green)',  label: 'Above 75th percentile', pillBg: 'var(--green-dim)' };
  if (v >= Number(p50)) return { color: 'var(--viz-1)',  label: 'Above median',           pillBg: 'var(--viz-1-dim)' };
  if (v >= Number(p25)) return { color: 'var(--orange)', label: 'Below median',           pillBg: 'var(--orange-dim)' };
  return                         { color: 'var(--rose)',  label: 'Below 25th percentile',  pillBg: 'var(--rose-dim)' };
}

function verdictSummary(offerTcRaw, offerBaseRaw, result) {
  if (!result || result.sampleSize === 0) return null;
  const tcPos  = offerTcRaw   ? offerPosition(offerTcRaw,   result.p25Tc,   result.p50Tc,   result.p75Tc)   : null;
  const basePos = offerBaseRaw ? offerPosition(offerBaseRaw, result.p25Base, result.p50Base, result.p75Base) : null;

  if (!tcPos && !basePos) return null;

  const aboveCount = [tcPos, basePos].filter(p => p && (p.label === 'Above median' || p.label === 'Above 75th percentile')).length;
  const total = [tcPos, basePos].filter(Boolean).length;

  const isPositive = aboveCount >= Math.ceil(total / 2);
  return {
    isPositive,
    title: isPositive ? 'Your offer is competitive' : 'Your offer is below market',
    sub: [tcPos && `Total comp ${tcPos.label.toLowerCase()}`, basePos && `Base ${basePos.label.toLowerCase()}`]
      .filter(Boolean).join(' · '),
  };
}

// ── Percentile Bar ────────────────────────────────────────────────────────────
function PercentileBar({ p25, p50, p75, avg, userVal, label }) {
  const max = Math.max(Number(p75) * 1.2, Number(userVal ?? 0) * 1.1);
  const pct = (v) => Math.min(100, (Number(v) / max) * 100);
  const pos = userVal ? offerPosition(userVal, p25, p50, p75) : null;

  return (
    <div style={{ marginBottom: 22 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{label}</span>
        {pos && (
          <span style={{ fontSize: 11, fontWeight: 600, color: pos.color, background: pos.pillBg, padding: '2px 9px', borderRadius: 20 }}>
            {pos.label}
          </span>
        )}
      </div>

      {/* Your offer context line */}
      {userVal && pos && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: pos.color, display: 'inline-block', flexShrink: 0 }} />
          Your offer: <strong style={{ color: 'var(--text-1)' }}>{fmt(userVal)}</strong>
        </div>
      )}

      {/* Bar */}
      <div style={{ position: 'relative', height: 7, background: 'var(--bg-3)', borderRadius: 99, overflow: 'visible' }}>
        <div style={{ position: 'absolute', left: `${pct(p25)}%`, width: `${pct(p75) - pct(p25)}%`, height: '100%', background: 'var(--viz-1-dim)', borderRadius: 99 }} />
        <div style={{ position: 'absolute', left: `${pct(p50)}%`, transform: 'translateX(-50%)', width: 2, height: 15, top: -4, background: 'var(--viz-1)', borderRadius: 2 }} />
        {userVal && (
          <div style={{ position: 'absolute', left: `${pct(userVal)}%`, transform: 'translateX(-50%)', width: 14, height: 14, top: -4, background: pos?.color ?? 'var(--text-1)', border: '2px solid var(--panel)', borderRadius: '50%', zIndex: 2 }} />
        )}
      </div>

      {/* P-labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
        <span>P25 {fmt(p25)}</span>
        <span style={{ color: 'var(--viz-1)', fontWeight: 600 }}>Median {fmt(p50)}</span>
        <span>P75 {fmt(p75)}</span>
      </div>
      {avg && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontFamily: "'IBM Plex Mono',monospace" }}>
          Market avg: <span style={{ color: 'var(--text-2)' }}>{fmt(avg)}</span>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  select: {
    width: '100%', height: 36, padding: '0 30px 0 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-2)',
    color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.3' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  },
};

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

  const availableLevels = useMemo(
    () => getLevelsForFunction(jobFunctionId),
    [jobFunctionId, getLevelsForFunction]
  );

  function handleFunctionChange(e) {
    setJobFunctionId(e.target.value);
    setFunctionLevelId('');
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

  const verdict = verdictSummary(offerTcRaw, offerBaseRaw, result);

  // ── Shared input field ──
  const inputStyle = {
    width: '100%', height: 36, padding: '0 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-2)',
    color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box',
  };

  // ── Offer input with ₹L suffix ──
  const OfferInput = ({ label, value, onChange }) => (
    <div>
      <div style={S.label}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input
          className="input-field"
          type="number"
          placeholder="e.g. 25"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, paddingRight: 34 }}
        />
        <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", pointerEvents: 'none' }}>₹L</span>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 760, marginTop: 8 }}>

      {/* ── Two-column shell: form left, results right ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: 16,
        alignItems: 'start',
      }}>

        {/* ── LEFT: Input card ── */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', position: 'sticky', top: 80 }}>

          {/* Job Title */}
          <div style={{ marginBottom: 14 }}>
            <div style={S.label}>Role / Job title</div>
            <input
              className="input-field"
              type="text"
              placeholder="Software Engineer, PM…"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleBenchmark()}
              style={inputStyle}
            />
          </div>

          {/* Function + Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={S.label}>Function</div>
              <select value={jobFunctionId} onChange={handleFunctionChange} style={S.select} disabled={!functionsReady}>
                <option value="">{functionsReady ? 'Any' : 'Loading…'}</option>
                {functions.map(fn => <option key={fn.id} value={fn.id}>{fn.displayName}</option>)}
              </select>
            </div>
            <div>
              <div style={S.label}>Level</div>
              <select
                value={functionLevelId}
                onChange={e => setFunctionLevelId(e.target.value)}
                style={{ ...S.select, opacity: jobFunctionId ? 1 : 0.5 }}
                disabled={!jobFunctionId}
              >
                <option value="">{jobFunctionId ? 'Any' : '— first pick function'}</option>
                {availableLevels.map(lv => <option key={lv.id} value={lv.id}>{lv.name}</option>)}
              </select>
            </div>
          </div>

          {/* Location */}
          <div style={{ marginBottom: 4 }}>
            <div style={S.label}>Location</div>
            <select value={location} onChange={e => setLocation(e.target.value)} style={S.select}>
              <option value="">All locations</option>
              {locations.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />

          {/* Optional offer inputs */}
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>
            Optional — enter your offer to benchmark it
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 0 }}>
            <OfferInput label="Total"  value={offerTc}     onChange={setOfferTc} />
            <OfferInput label="Base"   value={offerBase}   onChange={setOfferBase} />
            <OfferInput label="Equity" value={offerEquity} onChange={setOfferEquity} />
          </div>

          {/* CTA */}
          <button
            onClick={handleBenchmark}
            disabled={!canSubmit || loading}
            style={{
              width: '100%', height: 40, marginTop: 18, borderRadius: 9, border: 'none',
              background: canSubmit ? 'var(--viz-1)' : 'var(--bg-4)',
              color: canSubmit ? '#fff' : 'var(--text-3)',
              fontSize: 13, fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.7 : 1, transition: 'background 0.15s, opacity 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="0.5" y="7"   width="2.5" height="5.5" rx="0.8" fill="currentColor"/>
              <rect x="5"   y="4.5" width="2.5" height="8"   rx="0.8" fill="currentColor"/>
              <rect x="9.5" y="1.5" width="2.5" height="11"  rx="0.8" fill="currentColor"/>
            </svg>
            {loading ? 'Fetching data…' : 'Benchmark this role'}
          </button>
        </div>

        {/* ── RIGHT: Results ── */}
        <div>
          {/* Error */}
          {error && (
            <div style={{ padding: '11px 14px', background: 'var(--rose-dim)', border: '1px solid #fecdd3', borderRadius: 10, color: 'var(--rose)', fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* Empty / loading state */}
          {!result && !loading && !error && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>Ready to benchmark</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Fill in the role details and click Benchmark this role</div>
            </div>
          )}

          {loading && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 28px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              Fetching market data…
            </div>
          )}

          {/* Verdict card */}
          {verdict && (
            <div style={{
              background: verdict.isPositive ? 'var(--green-dim)' : 'var(--orange-dim)',
              border: `1px solid ${verdict.isPositive ? '#bbf7d0' : '#fde68a'}`,
              borderRadius: 12, padding: '16px 20px', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 14,
              animation: 'fadeUp 0.25s ease',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: verdict.isPositive ? '#dcfce7' : '#fef3c7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {verdict.isPositive
                  ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3.5 9.5l4 4 7-8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 5v5M9 12.5v.5" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/></svg>
                }
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{verdict.title}</div>
                <div style={{ fontSize: 12, color: verdict.isPositive ? 'var(--green)' : 'var(--orange)', marginTop: 2 }}>{verdict.sub}</div>
              </div>
            </div>
          )}

          {/* Result card */}
          {result && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', animation: 'fadeUp 0.25s ease' }}>

              {/* Result header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                    {result.role ?? 'All roles'}
                    {result.jobFunction && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>· {result.jobFunction}</span>}
                    {result.level && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)', marginLeft: 4 }}>/ {result.level}</span>}
                  </div>
                  {result.location && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                      📍 {result.location}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text-1)', lineHeight: 1 }}>
                    {result.sampleSize}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {result.sampleSize === 1 ? 'entry' : 'entries'}
                  </div>
                </div>
              </div>

              {/* Broadening notice */}
              {result.broadened && result.broadeningReason && (
                <div style={{ background: 'var(--viz-1-dim)', border: '1px solid var(--blue-mid)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--viz-1)', marginBottom: 18, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>ℹ️</span>
                  {result.broadeningReason} — results reflect a broader market
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

                  {/* Stat pills */}
                  {(result.avgBonus || result.avgEquity) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingTop: 18, borderTop: '1px solid var(--border)', marginTop: 4 }}>
                      {[
                        { label: 'Avg Bonus',  val: result.avgBonus,  color: 'var(--viz-2)' },
                        { label: 'Avg Equity', val: result.avgEquity, color: 'var(--viz-3)' },
                        { label: 'Avg Total',  val: result.avgTc,     color: 'var(--viz-1)' },
                      ].map(({ label, val, color }) => val && (
                        <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 9, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
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
      </div>

      {/* ── Responsive: collapse to single column on small screens ── */}
      <style>{`
        @media (max-width: 640px) {
          .bm-shell { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

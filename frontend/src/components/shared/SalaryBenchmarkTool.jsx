import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useLocations } from '../../hooks/useLocations';
import { useAppData } from '../../context/AppDataContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  if (v >= Number(p75)) return { key: 'top',   color: '#16a34a', label: 'Top quartile',          pillBg: '#dcfce7', border: '#bbf7d0' };
  if (v >= Number(p50)) return { key: 'above', color: '#16a34a', label: 'Above median',           pillBg: '#dcfce7', border: '#bbf7d0' };
  if (v >= Number(p25)) return { key: 'near',  color: '#2563eb', label: 'Below median',           pillBg: '#dbeafe', border: '#bfdbfe' };
  return                        { key: 'below', color: '#dc2626', label: 'Below 25th percentile', pillBg: '#fee2e2', border: '#fecaca' };
}

function calcPercentile(val, p25, p50, p75) {
  const v = Number(val), q1 = Number(p25), med = Number(p50), q3 = Number(p75);
  if (!v || !med) return null;
  if (v <= q1)  return Math.round((v / q1) * 25);
  if (v <= med) return 25 + Math.round(((v - q1) / (med - q1)) * 25);
  if (v <= q3)  return 50 + Math.round(((v - med) / (q3 - med)) * 25);
  return Math.min(99, 75 + Math.round(((v - q3) / (q3 * 0.35)) * 24));
}

function verdictSummary(offerTcRaw, offerBaseRaw, result) {
  if (!result || result.sampleSize === 0) return null;
  const tcPos   = offerTcRaw   ? offerPosition(offerTcRaw,   result.p25Tc,   result.p50Tc,   result.p75Tc)   : null;
  const basePos = offerBaseRaw ? offerPosition(offerBaseRaw, result.p25Base, result.p50Base, result.p75Base) : null;
  if (!tcPos && !basePos) return null;
  const posKeys = [tcPos, basePos].filter(Boolean).map(p => p.key);
  const isPositive = posKeys.filter(k => k === 'top' || k === 'above').length >= Math.ceil(posKeys.length / 2);
  return {
    isPositive,
    title: isPositive ? 'Your offer is competitive' : 'Your offer is below market',
    sub: [tcPos && `Total comp ${tcPos.label.toLowerCase()}`, basePos && `Base ${basePos.label.toLowerCase()}`]
      .filter(Boolean).join(' · '),
    color:  isPositive ? 'var(--green)'  : 'var(--orange)',
    bg:     isPositive ? 'var(--green-dim)' : 'var(--orange-dim)',
    border: isPositive ? '#bbf7d0' : '#fde68a',
  };
}

// ── Percentile bar ────────────────────────────────────────────────────────────
function PercentileBar({ p25, p50, p75, avg, userVal, label, animate }) {
  const max = Math.max(Number(p75) * 1.25, Number(userVal ?? 0) * 1.1, 1);
  const pct = (v) => Math.min(98, Math.max(2, (Number(v) / max) * 100));
  const pos = userVal ? offerPosition(userVal, p25, p50, p75) : null;
  const percentile = userVal ? calcPercentile(userVal, p25, p50, p75) : null;
  const [dotReady, setDotReady] = useState(false);

  // Bar zone colours — neutral when no user value, coloured when we know position
  const iqrColor    = pos ? `${pos.color}22` : 'var(--bg-3)';
  const iqrBorder   = pos ? `${pos.color}44` : 'rgba(0,0,0,0.08)';
  const medianColor = pos ? pos.color        : 'var(--viz-1)';

  useEffect(() => {
    if (animate) { const t = setTimeout(() => setDotReady(true), 80); return () => clearTimeout(t); }
    setDotReady(false);
  }, [animate, userVal]);

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
        {pos && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: pos.color,
            background: pos.pillBg, border: `1px solid ${pos.border}`,
            padding: '2px 10px', borderRadius: 20,
          }}>
            {pos.label}
          </span>
        )}
      </div>

      {/* Your offer row */}
      {userVal && pos && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: pos.color, display: 'inline-block', flexShrink: 0 }} />
            Your offer:&nbsp;<strong style={{ color: pos.color, fontFamily: "'IBM Plex Mono',monospace" }}>{fmt(userVal)}</strong>
          </div>
          {percentile !== null && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
              ~{percentile < 5 ? '<5' : percentile}th percentile
            </span>
          )}
        </div>
      )}

      {/* Bar track */}
      <div style={{ position: 'relative', height: 8, background: 'var(--bg-3)', borderRadius: 99 }}>
        {/* IQR fill — coloured by position */}
        <div style={{
          position: 'absolute', left: `${pct(p25)}%`,
          width: `${pct(p75) - pct(p25)}%`,
          height: '100%', background: iqrColor,
          borderRadius: 99, border: `1px solid ${iqrBorder}`,
          transition: 'background 0.3s ease',
        }} />
        {/* Median tick — coloured by position */}
        <div style={{
          position: 'absolute', left: `${pct(p50)}%`,
          transform: 'translateX(-50%)',
          width: 2, height: 16, top: -4,
          background: medianColor, borderRadius: 2, opacity: 0.85,
          transition: 'background 0.3s ease',
        }} />
        {/* User dot */}
        {userVal && (
          <div style={{
            position: 'absolute', left: `${pct(userVal)}%`,
            transform: 'translateX(-50%)',
            width: 16, height: 16, top: -4,
            background: pos?.color ?? 'var(--text-1)',
            border: '2.5px solid var(--panel)',
            borderRadius: '50%', zIndex: 2,
            boxShadow: `0 0 0 3px ${pos?.pillBg ?? 'transparent'}`,
            transition: dotReady ? 'left 0.5s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
          }} />
        )}
      </div>

      {/* P-labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
        <span>P25&nbsp;{fmt(p25)}</span>
        <span style={{ color: medianColor, fontWeight: 600 }}>Median&nbsp;{fmt(p50)}</span>
        <span>P75&nbsp;{fmt(p75)}</span>
      </div>
      {avg && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, fontFamily: "'IBM Plex Mono',monospace" }}>
          Market avg:&nbsp;<span style={{ color: 'var(--text-2)' }}>{fmt(avg)}</span>
        </div>
      )}
    </div>
  );
}

// ── Gap chip ──────────────────────────────────────────────────────────────────
function GapChip({ offerVal, medianVal, label }) {
  if (!offerVal || !medianVal) return null;
  const gap = Number(medianVal) - Number(offerVal);
  if (gap <= 0) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--orange-dim)', border: '1px solid #fde68a',
      borderRadius: 8, padding: '6px 12px', fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-2)' }}>To reach median ({label}):</span>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, color: 'var(--orange)' }}>
        +{fmt(gap)}
      </span>
    </div>
  );
}

// ── Offer input ───────────────────────────────────────────────────────────────
function fmtInrShort(lakhs) {
  // lakhs is the raw user input (e.g. "22" meaning 22L)
  if (!lakhs) return null;
  const n = parseFloat(String(lakhs).replace(/[^0-9.]/g, ''));
  if (isNaN(n) || n === 0) return null;
  const rupees = n * 100_000;
  if (rupees >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(1).replace(/\.0$/, '')}Cr`;
  return `₹${n.toFixed(1).replace(/\.0$/, '')}L`;
}

function fmtInrFull(lakhs) {
  if (!lakhs) return null;
  const n = parseFloat(String(lakhs).replace(/[^0-9.]/g, ''));
  if (isNaN(n) || n === 0) return null;
  const rupees = n * 100_000;
  return rupees.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function OfferInput({ label, value, onChange, placeholder = '0' }) {
  const short = fmtInrShort(value);
  const full  = fmtInrFull(value);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{
          position: 'absolute', left: 10,
          fontSize: 12, color: 'var(--text-3)',
          pointerEvents: 'none', fontFamily: "'IBM Plex Mono',monospace",
        }}>₹</span>
        <input
          className="input-field"
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={e => {
            const v = e.target.value.replace(/[^0-9.]/g, '');
            onChange(v);
          }}
          style={{
            width: '100%', height: 38,
            padding: `0 ${short ? '52px' : '28px'} 0 22px`,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--panel)',
            color: 'var(--text-1)',
            fontSize: 14, fontWeight: 500,
            fontFamily: "'IBM Plex Mono',monospace",
            boxSizing: 'border-box',
            MozAppearance: 'textfield',
          }}
        />
        {/* Readable short form overlay — e.g. ₹22L */}
        {short ? (
          <span style={{
            position: 'absolute', right: 8,
            fontSize: 11, fontWeight: 700, color: '#059669',
            pointerEvents: 'none', fontFamily: "'IBM Plex Mono',monospace",
            whiteSpace: 'nowrap',
          }}>{short}</span>
        ) : (
          <span style={{
            position: 'absolute', right: 8,
            fontSize: 10, color: 'var(--text-4)',
            pointerEvents: 'none', fontFamily: "'IBM Plex Mono',monospace",
            letterSpacing: '0.03em',
          }}>L</span>
        )}
      </div>
      {/* Full Indian locale sub-label — e.g. ₹22,00,000 / yr */}
      {full && (
        <span style={{
          fontSize: 10, color: 'var(--text-3)',
          fontFamily: "'IBM Plex Mono',monospace",
          marginTop: 3, display: 'block',
        }}>
          {full} / yr
        </span>
      )}
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 16, fontWeight: 700, color }}>{fmt(value)}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SalaryBenchmarkTool() {
  const { locations } = useLocations();
  const { functions, getLevelsForFunction, functionsReady } = useAppData();

  const formRef    = useRef(null);
  const resultsRef = useRef(null);

  const [jobFunctionId,   setJobFunctionId]   = useState('');
  const [functionLevelId, setFunctionLevelId] = useState('');
  const [location,        setLocation]        = useState('');
  const [offerBonus,      setOfferBonus]      = useState('');
  const [offerBase,       setOfferBase]       = useState('');
  const [offerEquity,     setOfferEquity]     = useState('');

  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [animate, setAnimate] = useState(false);

  const availableLevels = useMemo(
    () => getLevelsForFunction(jobFunctionId),
    [jobFunctionId, getLevelsForFunction]
  );

  function handleFunctionChange(e) {
    setJobFunctionId(e.target.value);
    setFunctionLevelId('');
  }

  const canSubmit = !!jobFunctionId;

  const handleBenchmark = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true); setError(null); setResult(null); setAnimate(false);
    try {
      const params = {};
      if (jobFunctionId)     params.jobFunctionId   = jobFunctionId;
      if (functionLevelId)   params.functionLevelId = functionLevelId;
      if (location)          params.location        = location;
      const res = await api.get('/public/salaries/benchmark', { params });
      setResult(res.data?.data ?? null);
      setTimeout(() => {
        setAnimate(true);
        // On mobile (single-column), scroll results into view
        if (window.innerWidth <= 780 && resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    } catch {
      setError('Failed to load benchmark data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [jobFunctionId, functionLevelId, location, canSubmit]);

  const parseInput = (v) => {
    if (!v) return null;
    const n = parseFloat(v.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n * 100_000;
  };

  const offerBonusRaw  = parseInput(offerBonus);
  const offerBaseRaw   = parseInput(offerBase);
  const offerEquityRaw = parseInput(offerEquity);

  // Total comp = Base + Bonus + Equity (only include components that were entered)
  const derivedTc = (offerBaseRaw || offerBonusRaw || offerEquityRaw)
    ? (offerBaseRaw ?? 0) + (offerBonusRaw ?? 0) + (offerEquityRaw ?? 0)
    : null;

  const verdict = verdictSummary(derivedTc, offerBaseRaw, result);

  const selectStyle = {
    width: '100%', height: 38, padding: '0 30px 0 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-2)',
    color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.3' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' };
  const inputStyle = {
    width: '100%', height: 38, padding: '0 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-2)',
    color: 'var(--text-1)', fontSize: 13, boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 1080 }}>
      <style>{`
        @keyframes bmFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bmSpin { to { transform: rotate(360deg); } }
        .bm-fadein { animation: bmFadeUp 0.28s ease both; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        @media (max-width: 780px) { .bm-shell { grid-template-columns: 1fr !important; } }
        @media (max-width: 780px) { .bm-stat-pills { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 780px) { .bm-edit-filters-btn { display: flex !important; } }
      `}</style>

      <div className="bm-shell" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Form card ── */}
        <div ref={formRef} style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
          position: 'sticky', top: 80,
          boxShadow: 'var(--shadow-sm)',
        }}>
          {/* Card header strip */}
          <div style={{
            padding: '13px 18px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-2)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="0.5" y="8"   width="2.5" height="5.5" rx="0.8" fill="var(--viz-1)" opacity="0.6"/>
              <rect x="5"   y="5"   width="2.5" height="8.5" rx="0.8" fill="var(--viz-2)" opacity="0.8"/>
              <rect x="9.5" y="1.5" width="2.5" height="12"  rx="0.8" fill="var(--viz-3)"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>Benchmark My Offer</span>
          </div>

          {/* Role fields */}
          <div style={{ padding: '18px 18px 0' }}>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Function
                <span style={{ color: 'var(--rose)', marginLeft: 3 }}>*</span>
              </label>
              <select value={jobFunctionId} onChange={handleFunctionChange} style={selectStyle} disabled={!functionsReady}>
                <option value="">{functionsReady ? 'Select a function…' : 'Loading…'}</option>
                {functions.map(fn => <option key={fn.id} value={fn.id}>{fn.displayName}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Level</label>
              <select
                value={functionLevelId}
                onChange={e => setFunctionLevelId(e.target.value)}
                style={{ ...selectStyle, opacity: jobFunctionId ? 1 : 0.45 }}
                disabled={!jobFunctionId}
              >
                <option value="">{jobFunctionId ? 'Any level' : '— select function first —'}</option>
                {availableLevels.map(lv => <option key={lv.id} value={lv.id}>{lv.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Location</label>
              <select value={location} onChange={e => setLocation(e.target.value)} style={selectStyle}>
                <option value="">All locations</option>
                {locations.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          {/* Offer inputs */}
          <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={labelStyle}>Your Offer</span>
              <span style={{
                fontSize: 10, color: 'var(--text-3)',
                background: 'var(--bg-3)', padding: '2px 8px',
                borderRadius: 20, border: '1px solid var(--border)',
                fontWeight: 500,
              }}>optional · ₹ Lakhs/yr</span>
            </div>

            {/* Three inputs stacked full-width */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <OfferInput label="Base Salary"  value={offerBase}   onChange={setOfferBase}   placeholder="e.g. 22" />
              <OfferInput label="Bonus"        value={offerBonus}  onChange={setOfferBonus}  placeholder="e.g. 3" />
              <OfferInput label="Equity / RSU" value={offerEquity} onChange={setOfferEquity} placeholder="e.g. 2" />
            </div>

            {/* Auto total chip */}
            {(offerBaseRaw || offerEquityRaw || offerBonusRaw) && (
              <div style={{
                marginTop: 12,
                padding: '10px 12px',
                background: 'var(--viz-1-dim)',
                border: '1px solid var(--blue-mid)',
                borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, color: 'var(--viz-1)', fontWeight: 500 }}>Total comp</span>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  fontFamily: "'IBM Plex Mono',monospace",
                  color: 'var(--viz-1)',
                }}>
                  {fmt(derivedTc)}
                </span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div style={{ padding: '16px 18px 20px' }}>
            <button
              onClick={handleBenchmark}
              disabled={!canSubmit || loading}
              style={{
                width: '100%', height: 42, borderRadius: 9, border: 'none',
                background: canSubmit ? 'var(--viz-1)' : 'var(--bg-4)',
                color: canSubmit ? '#fff' : 'var(--text-3)',
                fontSize: 13, fontWeight: 600,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                opacity: loading ? 0.7 : 1,
                transition: 'background 0.15s, opacity 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              {loading ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'bmSpin 0.8s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Fetching data…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="0.5" y="7"   width="2.5" height="5.5" rx="0.8" fill="currentColor"/>
                    <rect x="5"   y="4.5" width="2.5" height="8"   rx="0.8" fill="currentColor"/>
                    <rect x="9.5" y="1.5" width="2.5" height="11"  rx="0.8" fill="currentColor"/>
                  </svg>
                  Benchmark this role
                </>
              )}
            </button>
            {!canSubmit && (
              <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>
                Select a function to benchmark
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT: Results panel ── */}
        <div ref={resultsRef}>
          {/* Mobile-only: Edit Filters button — shown when results are visible */}
          {(result || loading || error) && (
            <button
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{
                display: 'none',  // shown via CSS below
                width: '100%', marginBottom: 12,
                padding: '10px 16px', borderRadius: 9,
                border: '1px solid var(--border)',
                background: 'var(--panel)',
                color: 'var(--text-2)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
              className="bm-edit-filters-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Filters
            </button>
          )}
          {/* Error */}
          {error && (
            <div className="bm-fadein" style={{
              padding: '12px 16px', background: 'var(--rose-dim)',
              border: '1px solid #fecdd3', borderRadius: 12,
              color: 'var(--rose)', fontSize: 13, marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v4M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {error}
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '64px 40px', textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'var(--viz-1-dim)', border: '1px solid var(--blue-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
              }}>
                <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
                  <rect x="1"  y="13" width="4" height="8"  rx="1.2" fill="var(--viz-1)" opacity="0.5"/>
                  <rect x="9"  y="8"  width="4" height="13" rx="1.2" fill="var(--viz-1)" opacity="0.75"/>
                  <rect x="17" y="3"  width="4" height="18" rx="1.2" fill="var(--viz-1)"/>
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Ready to benchmark</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 240, margin: '0 auto' }}>
                Select a <strong style={{ color: 'var(--text-2)' }}>Function</strong> and optionally a <strong style={{ color: 'var(--text-2)' }}>Level</strong> on the left, then click <strong style={{ color: 'var(--text-2)' }}>Benchmark this role</strong>
              </div>
            </div>
          )}

          {/* Shimmer skeleton */}
          {loading && (
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '24px', boxShadow: 'var(--shadow-sm)',
            }}>
              {[100, 55, 80].map((w, i) => (
                <div key={i} style={{
                  height: i === 0 ? 14 : 9, borderRadius: 6, marginBottom: 14,
                  background: 'var(--bg-3)', width: `${w}%`, opacity: 0.7,
                }} />
              ))}
              {[1, 2].map(n => (
                <div key={n} style={{ marginTop: 22 }}>
                  <div style={{ height: 8, width: '35%', background: 'var(--bg-3)', borderRadius: 6, marginBottom: 10, opacity: 0.6 }} />
                  <div style={{ height: 8, width: '100%', background: 'var(--bg-3)', borderRadius: 99, opacity: 0.4 }} />
                </div>
              ))}
            </div>
          )}

          {/* Verdict banner */}
          {verdict && (
            <div className="bm-fadein" style={{
              background: verdict.bg, border: `1px solid ${verdict.border}`,
              borderRadius: 14, padding: '20px 22px', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'var(--panel)', border: `2px solid ${verdict.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 0 4px ${verdict.bg}`,
              }}>
                {verdict.isPositive
                  ? <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5 6.5-7" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 4.5v5M8 11.5v.5" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="round"/></svg>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>{verdict.title}</div>
                <div style={{ fontSize: 12, color: verdict.color, fontWeight: 500 }}>{verdict.sub}</div>
              </div>
            </div>
          )}

          {/* Main result card */}
          {result && (
            <div className="bm-fadein" style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
            }}>
              {/* Result header */}
              <div style={{
                padding: '16px 22px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ minWidth: 0 }}>
                  {/* Function + Level pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    {result.jobFunction && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--viz-1)',
                        background: 'var(--viz-1-dim)', border: '1px solid var(--blue-mid)',
                        borderRadius: 6, padding: '2px 8px',
                      }}>{result.jobFunction}</span>
                    )}
                    {result.level && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--viz-2)',
                        background: 'var(--viz-2-dim, rgba(99,102,241,0.08))', border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: 6, padding: '2px 8px',
                      }}>{result.level}</span>
                    )}
                  </div>
                  {/* Role name */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                    {result.role ?? 'All roles'}
                  </div>
                  {result.location && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                        <path d="M4.5 0C2.29 0 .5 1.79.5 4c0 3 4 7 4 7s4-4 4-7c0-2.21-1.79-4-4-4zm0 5.5c-.83 0-1.5-.67-1.5-1.5S3.67 2.5 4.5 2.5 6 3.17 6 4s-.67 1.5-1.5 1.5z" fill="var(--text-3)"/>
                      </svg>
                      {result.location}
                    </div>
                  )}
                </div>
                <div style={{
                  textAlign: 'center', flexShrink: 0,
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '8px 14px',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text-1)', lineHeight: 1 }}>
                    {result.sampleSize}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                    {result.sampleSize === 1 ? 'entry' : 'entries'}
                  </div>
                </div>
              </div>

              <div style={{ padding: '20px 22px' }}>
                {/* Broadening notice */}
                {result.broadened && result.broadeningReason && (
                  <div style={{
                    background: 'var(--viz-1-dim)', border: '1px solid var(--blue-mid)',
                    borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--viz-1)',
                    marginBottom: 20, display: 'flex', gap: 7, alignItems: 'flex-start',
                  }}>
                    <span style={{ flexShrink: 0 }}>ℹ️</span>
                    {result.broadeningReason} — results reflect a broader market
                  </div>
                )}

                {result.sampleSize === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-3)', fontSize: 14 }}>
                    No matching salary data found. Try a broader search.
                  </div>
                ) : (
                  <>
                    {result.p50Tc && (
                      <PercentileBar
                        label="Total Compensation"
                        p25={result.p25Tc} p50={result.p50Tc} p75={result.p75Tc}
                        avg={result.avgTc} userVal={derivedTc} animate={animate}
                      />
                    )}
                    {/* Arrow divider between TC and Base bars */}
                    {result.p50Tc && result.p50Base && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        margin: '-8px 0 18px',
                      }}>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                        <div style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                          color: 'var(--text-4)', flexShrink: 0,
                        }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 2v10M3.5 8.5L7 12l3.5-3.5" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                      </div>
                    )}
                    {result.p50Base && (
                      <PercentileBar
                        label="Base Salary"
                        p25={result.p25Base} p50={result.p50Base} p75={result.p75Base ?? result.p75Tc}
                        avg={result.avgBase} userVal={offerBaseRaw} animate={animate}
                      />
                    )}

                    {/* Gap chips */}
                    {(offerBaseRaw || derivedTc) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                        {derivedTc    && <GapChip offerVal={derivedTc}    medianVal={result.p50Tc}   label="TC"   />}
                        {offerBaseRaw && <GapChip offerVal={offerBaseRaw} medianVal={result.p50Base} label="Base" />}
                      </div>
                    )}

                    {/* Stat pills */}
                    {(result.avgBonus || result.avgEquity || result.avgTc) && (
                      <div className="bm-stat-pills" style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10,
                        paddingTop: 16, borderTop: '1px solid var(--border)',
                      }}>
                        <StatPill label="Avg Bonus"  value={result.avgBonus}  color="var(--viz-2)" />
                        <StatPill label="Avg Equity" value={result.avgEquity} color="var(--viz-3)" />
                        <StatPill label="Avg Total"  value={result.avgTc}     color="var(--viz-1)" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

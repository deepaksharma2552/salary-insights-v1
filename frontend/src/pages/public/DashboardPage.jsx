import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

/* ─── Shared helpers ─────────────────────────────────────────────────────── */
const fmt = (val) => {
  if (!val && val !== 0) return '—';
  const l = val / 100000;
  return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
};

const BAR_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#16a34a', '#ea580c', '#e11d48', '#d97706', '#0284c7'];

const LEVEL_COLORS = {
  'SDE 1': '#0ea5e9', 'SDE 2': '#6366f1', 'SDE 3': '#8b5cf6',
  'Staff Engineer': '#10b981', 'Principal Engineer': '#059669',
  'Architect': '#f59e0b', 'Engineering Manager': '#f97316',
  'Sr. Engineering Manager': '#ef4444', 'Director': '#dc2626',
  'Sr. Director': '#b91c1c', 'VP': '#7f1d1d',
};

/* ─── Stacked bar row with per-bar tooltip ───────────────────────────────── */
function StackedBarRow({ label, base, bonus, equity, total, count, maxTotal, color, labelWidth = 110 }) {
  const [tip, setTip] = useState(false);
  const rowRef        = useRef(null);
  const [tipLeft, setTipLeft] = useState('50%');

  const safeMax  = maxTotal || 1;
  const basePct  = Math.round(((base  || 0) / safeMax) * 100);
  const bonusPct = Math.round(((bonus || 0) / safeMax) * 100);
  const eqPct    = Math.round(((equity|| 0) / safeMax) * 100);

  function handleMouseEnter(e) {
    setTip(true);
    // keep tooltip inside card — clamp left position
    if (rowRef.current) {
      const rect    = rowRef.current.getBoundingClientRect();
      const parentRect = rowRef.current.closest('.chart-card')?.getBoundingClientRect();
      if (parentRect) {
        const rel = e.clientX - parentRect.left;
        const clamped = Math.max(80, Math.min(rel, parentRect.width - 80));
        setTipLeft(clamped + 'px');
      }
    }
  }

  return (
    <div
      ref={rowRef}
      className="level-bar-row"
      style={{ position: 'relative', cursor: 'default' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTip(false)}
    >
      {/* Label */}
      <span className="level-bar-label" style={{ minWidth: labelWidth, fontSize: 11 }}>{label}</span>

      {/* Stacked bar */}
      <div className="level-bar-track" style={{ flex: 1, position: 'relative' }}>
        {/* Base segment */}
        {basePct > 0 && (
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${basePct}%`, background: color, borderRadius: '3px 0 0 3px',
          }} />
        )}
        {/* Bonus segment */}
        {bonusPct > 0 && (
          <div style={{
            position: 'absolute', left: `${basePct}%`, top: 0, bottom: 0,
            width: `${bonusPct}%`, background: `${color}99`,
          }} />
        )}
        {/* Equity segment */}
        {eqPct > 0 && (
          <div style={{
            position: 'absolute', left: `${basePct + bonusPct}%`, top: 0, bottom: 0,
            width: `${eqPct}%`, background: `${color}44`,
            borderRadius: eqPct > 0 ? '0 3px 3px 0' : 0,
          }} />
        )}
      </div>

      {/* Total value */}
      <span className="level-bar-val" style={{ minWidth: 52 }}>{fmt(total || base)}</span>

      {/* Tooltip */}
      {tip && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)',
          left: tipLeft, transform: 'translateX(-50%)',
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 13px',
          fontSize: 11, color: 'var(--text-2)',
          zIndex: 200, pointerEvents: 'none',
          boxShadow: '0 6px 24px rgba(0,0,0,0.20)',
          minWidth: 180,
        }}>
          {/* Tooltip header */}
          <div style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 7, fontSize: 12 }}>
            {label}
            {count != null && (
              <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 10, marginLeft: 6 }}>
                {count} {count === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>
          {/* Base */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--text-3)' }}>Base</span>
            <span style={{ fontWeight: 600, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>{fmt(base)}</span>
          </div>
          {/* Bonus */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: `${color}99`, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--text-3)' }}>Bonus</span>
            <span style={{ fontWeight: 600, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>{fmt(bonus)}</span>
          </div>
          {/* Equity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: `${color}44`, flexShrink: 0 }} />
            <span style={{ flex: 1, color: 'var(--text-3)' }}>Equity</span>
            <span style={{ fontWeight: 600, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>{fmt(equity)}</span>
          </div>
          {/* Divider + Total */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-3)' }}>Total comp</span>
            <span style={{ fontWeight: 700, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>{fmt(total)}</span>
          </div>
          {/* Caret */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid var(--border)',
          }} />
        </div>
      )}
    </div>
  );
}

/* ─── Bar legend ─────────────────────────────────────────────────────────── */
function BarLegend({ color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--text-3)', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 10, height: 8, borderRadius: 2, background: color || '#2563eb' }} />
        Base
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 10, height: 8, borderRadius: 2, background: `${color || '#2563eb'}99` }} />
        Bonus
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 10, height: 8, borderRadius: 2, background: `${color || '#2563eb'}44` }} />
        Equity
      </div>
    </div>
  );
}

/* ─── Confidence badge ───────────────────────────────────────────────────── */
function ConfidenceBadge({ tier, label }) {
  const [showTip, setShowTip] = useState(false);
  if (!tier) return null;
  const cfg = {
    HIGH:         { color: '#16a34a', bg: '#16a34a18', dot: '#16a34a', text: 'High' },
    MEDIUM:       { color: '#d97706', bg: '#d9770618', dot: '#d97706', text: 'Med'  },
    LOW:          { color: '#e11d48', bg: '#e11d4818', dot: '#e11d48', text: 'Low'  },
    INSUFFICIENT: { color: '#6b7280', bg: '#6b728018', dot: '#6b7280', text: '?'    },
  }[tier] ?? { color: '#6b7280', bg: '#6b728018', dot: '#6b7280', text: '?' };

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px', borderRadius: 100,
          background: cfg.bg, border: `1px solid ${cfg.color}33`,
          cursor: 'default', userSelect: 'none',
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '0.03em' }}>
          {cfg.text}
        </span>
      </div>
      {showTip && label && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 10px',
          fontSize: 11, color: 'var(--text-2)',
          whiteSpace: 'nowrap', zIndex: 100,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 2, color: cfg.color }}>Data confidence</div>
          {label}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid var(--border)',
          }} />
        </div>
      )}
    </div>
  );
}

/* ─── Multiselect filter (generic) ──────────────────────────────────────── */
function MultiFilter({ label, items, selected, onChange, max = 5 }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef             = useRef(null);

  useEffect(() => {
    function handle(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filtered = items.filter(c => c.toLowerCase().includes(search.toLowerCase()) && !selected.includes(c));

  function toggle(item) {
    if (selected.includes(item)) onChange(selected.filter(c => c !== item));
    else if (selected.length < max) onChange([...selected, item]);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 8,
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        cursor: 'pointer', fontSize: 11, color: 'var(--text-2)',
        fontFamily: "'IBM Plex Mono',monospace",
      }}>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="9" y2="18"/>
        </svg>
        {label}
        {selected.length > 0 && (
          <span style={{ background: '#2563eb', color: '#fff', borderRadius: 100, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
            {selected.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 8, minWidth: 210, zIndex: 50,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search…`}
            style={{
              width: '100%', padding: '6px 8px', borderRadius: 6,
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-1)', outline: 'none',
              fontFamily: "'IBM Plex Mono',monospace", boxSizing: 'border-box',
            }}
          />
          {selected.length >= max && (
            <div style={{ fontSize: 10, color: '#d97706', padding: '4px 4px 0', fontFamily: "'IBM Plex Mono',monospace" }}>
              Max {max} selected
            </div>
          )}
          <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 6 }}>
            {filtered.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '6px 4px' }}>No matches</div>}
            {filtered.map(item => (
              <div key={item} onClick={() => toggle(item)}
                style={{
                  padding: '6px 8px', borderRadius: 6,
                  cursor: selected.length >= max ? 'not-allowed' : 'pointer',
                  fontSize: 12, color: selected.length >= max ? 'var(--text-4)' : 'var(--text-2)',
                  opacity: selected.length >= max ? 0.5 : 1, transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (selected.length < max) e.currentTarget.style.background = 'var(--bg-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >{item}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Selected chips ─────────────────────────────────────────────────────── */
function Chips({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
      {items.map((c, ci) => (
        <div key={c} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 100,
          background: `${BAR_COLORS[ci % BAR_COLORS.length]}18`,
          border: `1px solid ${BAR_COLORS[ci % BAR_COLORS.length]}44`,
          fontSize: 11, color: BAR_COLORS[ci % BAR_COLORS.length], fontWeight: 500,
        }}>
          {c}
          <span onClick={() => onRemove(c)} style={{ cursor: 'pointer', opacity: 0.7, lineHeight: 1 }}>×</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [byLocation,     setByLocation]     = useState([]);
  const [byLocationLevel,setByLocationLevel]= useState([]);
  const [byCompanyLevel, setByCompanyLevel] = useState([]);
  const [loading,        setLoading]        = useState(true);

  const [selLocations,  setSelLocations]  = useState([]);
  const [selCompanies,  setSelCompanies]  = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/public/salaries/analytics/by-location'),
      api.get('/public/salaries/analytics/by-location-level'),
      api.get('/public/salaries/analytics/by-company-level'),
    ]).then(([loc, locLvl, cl]) => {
      setByLocation(loc.data?.data      ?? []);
      setByLocationLevel(locLvl.data?.data ?? []);
      setByCompanyLevel(cl.data?.data   ?? []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── Derived: group location-level data by location ── */
  const locationLevelGrouped = useMemo(() =>
    byLocationLevel.reduce((acc, row) => {
      if (!acc[row.location]) acc[row.location] = [];
      acc[row.location].push(row);
      return acc;
    }, {}),
  [byLocationLevel]);

  /* ── Derived: group company-level data by company ── */
  const companyGrouped = useMemo(() =>
    byCompanyLevel.reduce((acc, row) => {
      if (!acc[row.companyName]) acc[row.companyName] = [];
      acc[row.companyName].push(row);
      return acc;
    }, {}),
  [byCompanyLevel]);

  const allLocationNames = useMemo(() => byLocation.map(r => r.groupKey).filter(Boolean), [byLocation]);
  const allCompanyNames  = useMemo(() => Object.keys(companyGrouped), [companyGrouped]);

  const visibleLocations = selLocations.length > 0 ? selLocations.filter(l => locationLevelGrouped[l]) : [];
  const visibleCompanies = selCompanies.length > 0 ? selCompanies.filter(c => companyGrouped[c]) : allCompanyNames.slice(0, 6);

  /* ── Max total comp across relevant rows ── */
  const maxLocTotal = useMemo(() =>
    byLocation.length ? Math.max(...byLocation.map(r => r.avgTotalCompensation ?? 0), 1) : 1,
  [byLocation]);

  const maxLocLevelTotal = useMemo(() => {
    const rows = visibleLocations.flatMap(l => locationLevelGrouped[l] ?? []);
    return rows.length ? Math.max(...rows.map(r => r.avgTotalCompensation ?? 0), 1) : 1;
  }, [visibleLocations, locationLevelGrouped]);

  const maxCompanyLevelTotal = useMemo(() => {
    const rows = visibleCompanies.flatMap(c => companyGrouped[c] ?? []);
    return rows.length ? Math.max(...rows.map(r => r.avgTotalCompensation ?? 0), 1) : 1;
  }, [visibleCompanies, companyGrouped]);

  const EmptyState = () => (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>
      No data available yet.
    </div>
  );

  return (
    <section className="section">

      {/* ── HEADER ── */}
      <div className="section-header">
        <span className="section-tag">Analytics</span>
        <h2 className="section-title">360° Compensation <em>Intelligence</em></h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>
          Aggregated salary data across all approved submissions
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>
          Loading analytics…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>

          {/* ── CHART 1 — Avg Base Salary by Location ── */}
          <div className="chart-card">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
              <div>
                <div className="chart-title">Avg Base Salary by Location</div>
                <div className="chart-subtitle">
                  {selLocations.length > 0
                    ? 'Internal level breakdown · hover each bar for details'
                    : 'All metro areas · select locations to drill down by level'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <MultiFilter
                  label="Filter locations"
                  items={allLocationNames}
                  selected={selLocations}
                  onChange={setSelLocations}
                  max={5}
                />
                {selLocations.length > 0 && (
                  <button onClick={() => setSelLocations([])} style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'IBM Plex Mono',monospace" }}>
                    ✕ clear filter
                  </button>
                )}
              </div>
            </div>

            {/* Selected location chips */}
            <Chips items={selLocations} onRemove={loc => setSelLocations(selLocations.filter(l => l !== loc))} />

            {byLocation.length === 0 ? <EmptyState /> : (
              <>
                {/* ── Default view: one bar per location ── */}
                {selLocations.length === 0 && (
                  <>
                    <BarLegend color={BAR_COLORS[0]} />
                    <div className="level-bars">
                      {byLocation.slice(0, 8).map((row, i) => (
                        <StackedBarRow
                          key={row.groupKey}
                          label={row.groupKey}
                          base={row.avgBaseSalary}
                          bonus={row.avgBonus}
                          equity={row.avgEquity}
                          total={row.avgTotalCompensation}
                          count={row.count}
                          maxTotal={maxLocTotal}
                          color={BAR_COLORS[i % BAR_COLORS.length]}
                          labelWidth={90}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* ── Filtered view: sections per location, bars per level ── */}
                {selLocations.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {visibleLocations.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)', fontSize: 12 }}>
                        No level data for selected locations yet.
                      </div>
                    )}
                    {visibleLocations.map((loc, li) => {
                      const rows  = locationLevelGrouped[loc] ?? [];
                      const color = BAR_COLORS[li % BAR_COLORS.length];
                      return (
                        <div key={loc}>
                          {/* Location header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>{loc}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
                              {rows.length} level{rows.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <BarLegend color={color} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {rows.map(row => (
                              <StackedBarRow
                                key={row.internalLevel}
                                label={row.internalLevel}
                                base={row.avgBaseSalary}
                                bonus={row.avgBonus}
                                equity={row.avgEquity}
                                total={row.avgTotalCompensation}
                                count={row.count}
                                maxTotal={maxLocLevelTotal}
                                color={LEVEL_COLORS[row.internalLevel] ?? color}
                                labelWidth={130}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── CHART 2 — Avg Base Salary by Company & Level ── */}
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
              <div>
                <div className="chart-title">Avg Base Salary by Company &amp; Level</div>
                <div className="chart-subtitle">Hover each bar for Base · Bonus · Equity breakdown</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <MultiFilter
                  label="Filter companies"
                  items={allCompanyNames}
                  selected={selCompanies}
                  onChange={setSelCompanies}
                  max={5}
                />
                {selCompanies.length > 0 && (
                  <button onClick={() => setSelCompanies([])} style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'IBM Plex Mono',monospace" }}>
                    ✕ clear filter
                  </button>
                )}
              </div>
            </div>

            <Chips items={selCompanies} onRemove={c => setSelCompanies(selCompanies.filter(x => x !== c))} />

            {byCompanyLevel.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {visibleCompanies.map((company, ci) => {
                  const rows     = companyGrouped[company] ?? [];
                  const firstRow = rows[0];
                  const color    = BAR_COLORS[ci % BAR_COLORS.length];
                  return (
                    <div key={company}>
                      {/* Company header: logo + name + confidence */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <CompanyLogo
                          companyId={firstRow?.companyId}
                          companyName={company}
                          logoUrl={firstRow?.logoUrl}
                          website={firstRow?.website}
                          size={20}
                          radius={4}
                        />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{company}</span>
                        <ConfidenceBadge tier={firstRow?.confidenceTier} label={firstRow?.confidenceLabel} />
                      </div>
                      <BarLegend color={color} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {rows.map(row => (
                          <StackedBarRow
                            key={row.internalLevel}
                            label={row.internalLevel}
                            base={row.avgBaseSalary}
                            bonus={row.avgBonus}
                            equity={row.avgEquity}
                            total={row.avgTotalCompensation}
                            count={row.count}
                            maxTotal={maxCompanyLevelTotal}
                            color={LEVEL_COLORS[row.internalLevel] ?? color}
                            labelWidth={130}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </section>
  );
}

import { useState, useEffect, useRef, useMemo } from 'react';
import React from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS
   Base   → blue   #3b82f6
   Bonus  → violet #8b5cf6
   Equity → cyan   #06b6d4
   These are fixed across the entire dashboard — same color always means
   the same thing, making both charts instantly comparable.
───────────────────────────────────────────────────────────────────────────── */
const PALETTE = {
  base:   { solid: '#3b82f6', grad: 'linear-gradient(90deg,#2563eb,#3b82f6)', light: '#3b82f618' },
  bonus:  { solid: '#8b5cf6', grad: 'linear-gradient(90deg,#7c3aed,#8b5cf6)', light: '#8b5cf618' },
  equity: { solid: '#06b6d4', grad: 'linear-gradient(90deg,#0891b2,#06b6d4)', light: '#06b6d418' },
};

const BAR_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#6366f1','#a78bfa','#22d3ee','#818cf8','#c4b5fd'];

const fmt = (val) => {
  if (!val && val !== 0) return '—';
  const l = val / 100000;
  return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
};

/* ─── Shared global legend — always shown once per card ─────────────────── */
function BarLegend() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
      {[['base','Base'],['bonus','Bonus'],['equity','Equity']].map(([key, label]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 24, height: 8, borderRadius: 4,
            background: PALETTE[key].grad,
          }} />
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Stacked bar — the core visual unit ────────────────────────────────── */
function StackedBar({ base, bonus, equity, total, maxTotal }) {
  const safeMax  = maxTotal || 1;
  const basePct  = Math.min(100, ((base  || 0) / safeMax) * 100);
  const bonusPct = Math.min(100 - basePct, ((bonus  || 0) / safeMax) * 100);
  const eqPct    = Math.min(100 - basePct - bonusPct, ((equity || 0) / safeMax) * 100);
  const GAP      = 2; // px gap between segments

  return (
    <div style={{
      flex: 1, height: 12, borderRadius: 6,
      background: 'var(--bg-3)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'stretch',
    }}>
      {/* Base segment */}
      {basePct > 0 && (
        <div style={{
          width: `calc(${basePct}% - ${bonus||equity ? GAP : 0}px)`,
          background: PALETTE.base.grad,
          borderRadius: bonus || equity ? '6px 0 0 6px' : '6px',
          flexShrink: 0,
          marginRight: bonus || equity ? GAP : 0,
        }} />
      )}
      {/* Bonus segment */}
      {bonusPct > 0 && (
        <div style={{
          width: `calc(${bonusPct}% - ${equity ? GAP : 0}px)`,
          background: PALETTE.bonus.grad,
          borderRadius: equity ? '0' : '0 6px 6px 0',
          flexShrink: 0,
          marginRight: equity ? GAP : 0,
        }} />
      )}
      {/* Equity segment */}
      {eqPct > 0 && (
        <div style={{
          width: `${eqPct}%`,
          background: PALETTE.equity.grad,
          borderRadius: '0 6px 6px 0',
          flexShrink: 0,
        }} />
      )}
    </div>
  );
}

/* ─── Tooltip content (rendered inside the positioned tooltip box) ───────── */
function TooltipContent({ label, sublabel, base, bonus, equity, total, count }) {
  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-1)', lineHeight: 1.3 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{sublabel}</div>}
        {count != null && (
          <div style={{
            display: 'inline-block', marginTop: 4,
            fontSize: 9, fontWeight: 600, color: 'var(--text-3)',
            background: 'var(--bg-3)', borderRadius: 100,
            padding: '1px 7px', fontFamily: "'IBM Plex Mono',monospace",
          }}>
            {count} {count === 1 ? 'entry' : 'entries'}
          </div>
        )}
      </div>

      {/* Rows */}
      {[
        { key: 'base',   label: 'Base',   val: base },
        { key: 'bonus',  label: 'Bonus',  val: bonus },
        { key: 'equity', label: 'Equity', val: equity },
      ].map(({ key, label: lbl, val }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <div style={{
            width: 28, height: 8, borderRadius: 3,
            background: PALETTE[key].grad, flexShrink: 0,
          }} />
          <span style={{ flex: 1, fontSize: 11, color: 'var(--text-3)' }}>{lbl}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-1)',
            fontFamily: "'IBM Plex Mono',monospace",
          }}>{fmt(val)}</span>
        </div>
      ))}

      {/* Total */}
      <div style={{
        borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 6,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Total comp</span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: 'var(--text-1)',
          fontFamily: "'IBM Plex Mono',monospace",
        }}>{fmt(total)}</span>
      </div>
    </>
  );
}

/* ─── Full bar row: label + stacked bar + value + hover tooltip ─────────── */
function BarRow({ label, sublabel, base, bonus, equity, total, count, maxTotal, labelWidth = 110 }) {
  const [tip, setTip]     = useState(false);
  const [tipX, setTipX]   = useState('50%');
  const rowRef            = useRef(null);

  function onEnter(e) {
    setTip(true);
    const card = rowRef.current?.closest('.chart-card');
    if (card) {
      const cardRect = card.getBoundingClientRect();
      const rawX     = e.clientX - cardRect.left;
      // clamp so tooltip (200px wide) stays inside card
      const clamped  = Math.max(100, Math.min(rawX, cardRect.width - 100));
      setTipX(clamped + 'px');
    }
  }

  return (
    <div
      ref={rowRef}
      className="level-bar-row"
      style={{ cursor: 'default' }}
      onMouseEnter={onEnter}
      onMouseLeave={() => setTip(false)}
    >
      {/* Label */}
      <span className="level-bar-label" style={{ minWidth: labelWidth }}>{label}</span>

      {/* Stacked bar */}
      <StackedBar base={base} bonus={bonus} equity={equity} total={total} maxTotal={maxTotal} />

      {/* Total value */}
      <span className="level-bar-val">{fmt(total || base)}</span>

      {/* Tooltip */}
      {tip && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: tipX,
          transform: 'translateX(-50%)',
          width: 210,
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 14px',
          zIndex: 300,
          pointerEvents: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        }}>
          <TooltipContent
            label={label}
            sublabel={sublabel}
            base={base} bonus={bonus} equity={equity} total={total} count={count}
          />
          {/* Arrow */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid var(--border)',
          }} />
        </div>
      )}
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
        <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, fontFamily: "'IBM Plex Mono',monospace" }}>
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
          whiteSpace: 'nowrap', zIndex: 400,
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

/* ─── Multiselect filter ─────────────────────────────────────────────────── */
function MultiFilter({ label, items, selected, onChange, max = 5 }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef             = useRef(null);

  useEffect(() => {
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Show ALL items (selected + unselected), filtered by search
  const filtered = items.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  // Sort: selected first, then alphabetical
  const sorted = [
    ...filtered.filter(c => selected.includes(c)),
    ...filtered.filter(c => !selected.includes(c)),
  ];

  function toggle(item) {
    if (selected.includes(item)) {
      onChange(selected.filter(c => c !== item));
    } else if (selected.length < max) {
      onChange([...selected, item]);
    }
  }

  const atMax = selected.length >= max;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 8,
        background: open ? 'var(--bg-3)' : 'var(--bg-2)',
        border: `1px solid ${selected.length > 0 ? '#3b82f680' : 'var(--border)'}`,
        cursor: 'pointer', fontSize: 11, color: 'var(--text-2)',
        fontFamily: "'IBM Plex Mono',monospace",
        transition: 'all 0.15s',
      }}>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="4" y1="12" x2="14" y2="12"/>
          <line x1="4" y1="18" x2="9" y2="18"/>
        </svg>
        {label}
        {selected.length > 0 && (
          <span style={{
            background: '#3b82f6', color: '#fff',
            borderRadius: 100, padding: '1px 6px',
            fontSize: 10, fontWeight: 700,
          }}>
            {selected.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, minWidth: 230, zIndex: 50,
          boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 8px 4px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '5px 8px',
            }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="var(--text-3)" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                autoFocus value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  fontSize: 11, color: 'var(--text-1)', outline: 'none',
                  fontFamily: "'IBM Plex Mono',monospace",
                }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 200, overflowY: 'auto', padding: '2px 4px' }}>
            {sorted.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '10px 8px', textAlign: 'center' }}>
                No matches
              </div>
            )}
            {sorted.map(item => {
              const isChecked  = selected.includes(item);
              const isDisabled = !isChecked && atMax;
              return (
                <div
                  key={item}
                  onClick={() => !isDisabled && toggle(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '7px 8px', borderRadius: 7, marginBottom: 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    background: isChecked ? '#3b82f610' : 'transparent',
                    opacity: isDisabled ? 0.4 : 1,
                    transition: 'background 0.12s',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isDisabled && !isChecked)
                      e.currentTarget.style.background = 'var(--bg-2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isChecked ? '#3b82f610' : 'transparent';
                  }}
                >
                  {/* Custom checkbox */}
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    border: isChecked ? '2px solid #3b82f6' : '1.5px solid var(--border-2, #6b728060)',
                    background: isChecked ? '#3b82f6' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.12s',
                  }}>
                    {isChecked && (
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  {/* Label */}
                  <span style={{
                    fontSize: 12, flex: 1,
                    color: isChecked ? 'var(--text-1)' : 'var(--text-2)',
                    fontWeight: isChecked ? 500 : 400,
                  }}>
                    {item}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 10px 8px',
            borderTop: '1px solid var(--border)',
          }}>
            <span style={{
              fontSize: 10, color: atMax ? '#d97706' : 'var(--text-3)',
              fontFamily: "'IBM Plex Mono',monospace", fontWeight: atMax ? 600 : 400,
            }}>
              {selected.length} / {max} selected
            </span>
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                style={{
                  fontSize: 10, color: '#3b82f6', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: "'IBM Plex Mono',monospace", fontWeight: 500,
                }}
              >
                Clear all
              </button>
            )}
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
          border: `1px solid ${BAR_COLORS[ci % BAR_COLORS.length]}40`,
          fontSize: 11, color: BAR_COLORS[ci % BAR_COLORS.length], fontWeight: 500,
        }}>
          {c}
          <span
            onClick={() => onRemove(c)}
            style={{ cursor: 'pointer', opacity: 0.6, lineHeight: 1, fontSize: 13 }}
          >×</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Section header for grouped charts (location / company) ─────────────── */
function GroupHeader({ dot, children, meta }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      {dot && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: dot, flexShrink: 0,
          boxShadow: `0 0 0 3px ${dot}28`,
        }} />
      )}
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>{children}</span>
      {meta && <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>{meta}</span>}
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */
const EmptyState = () => (
  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>
    No data available yet.
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [byLocationLevel, setByLocationLevel] = useState([]);
  const [byCompanyLevel,  setByCompanyLevel]  = useState([]);
  const [initialLoading,  setInitialLoading]  = useState(true);  // first paint only
  const [refetching,      setRefetching]      = useState(false); // filter re-fetch — no blink

  const [selLocations, setSelLocations] = useState([]);
  const [selCompanies, setSelCompanies] = useState([]);
  const [selLocationsForCompany, setSelLocationsForCompany] = useState([]);
  const [selLevels, setSelLevels] = useState([]);

  // All valid location display names (from the Location enum — matches what the DB stores)
  const ALL_LOCATIONS = [
    'Bengaluru', 'Hyderabad', 'Pune', 'Delhi-NCR',
    'Kochi', 'Coimbatore', 'Mysore', 'Mangaluru',
  ];

  // Fetch company-level data — re-runs whenever location filter changes
  const fetchCompanyLevel = React.useCallback(() => {
    const params = selLocationsForCompany.length > 0
      ? { locations: selLocationsForCompany }
      : {};
    return api.get('/public/salaries/analytics/by-company-level', { params });
  }, [selLocationsForCompany]);

  // Initial load — fetch both charts in parallel, show full-page spinner once
  useEffect(() => {
    Promise.all([
      api.get('/public/salaries/analytics/by-location-level'),
      api.get('/public/salaries/analytics/by-company-level'),
    ]).then(([locLvl, cl]) => {
      setByLocationLevel(locLvl.data?.data ?? []);
      setByCompanyLevel(cl.data?.data      ?? []);
    }).catch(console.error)
      .finally(() => setInitialLoading(false));
  }, []);

  // Re-fetch company-level data whenever location filter changes.
  // Uses refetching (not initialLoading) so the chart stays visible — no blink.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setRefetching(true);
    fetchCompanyLevel()
      .then(cl => setByCompanyLevel(cl.data?.data ?? []))
      .catch(console.error)
      .finally(() => setRefetching(false));
  }, [fetchCompanyLevel]);

  /* ── Group location-level rows by location ── */
  const locationGrouped = useMemo(() =>
    byLocationLevel.reduce((acc, row) => {
      if (!acc[row.location]) acc[row.location] = [];
      acc[row.location].push(row);
      return acc;
    }, {}),
  [byLocationLevel]);

  /* ── Group company-level rows by company ── */
  const companyGrouped = useMemo(() =>
    byCompanyLevel.reduce((acc, row) => {
      if (!acc[row.companyName]) acc[row.companyName] = [];
      acc[row.companyName].push(row);
      return acc;
    }, {}),
  [byCompanyLevel]);

  const allLocations    = useMemo(() => Object.keys(locationGrouped), [locationGrouped]);
  const allCompanyNames = useMemo(() => Object.keys(companyGrouped),  [companyGrouped]);
  const allLevelNames   = useMemo(() => {
    const seen = new Set();
    byCompanyLevel.forEach(row => { if (row.internalLevel) seen.add(row.internalLevel); });
    // Sort by known seniority order, unknowns go to end alphabetically
    const ORDER = ['SDE 1','SDE 2','SDE 3','Staff Engineer','Principal Engineer','Architect',
                   'Engineering Manager','Sr. Engineering Manager','Director','Sr. Director','VP'];
    return [...seen].sort((a, b) => {
      const ai = ORDER.indexOf(a); const bi = ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [byCompanyLevel]);

  /* ── Visible items — filter if selected, else show all / top 6 ── */
  const visibleLocations = selLocations.length > 0
    ? selLocations.filter(l => locationGrouped[l])
    : allLocations;

  const visibleCompanies = selCompanies.length > 0
    ? selCompanies.filter(c => companyGrouped[c])
    : allCompanyNames.slice(0, 6);

  /* ── Max total comp — denominator for bar widths ── */
  const maxLocTotal = useMemo(() => {
    const rows = visibleLocations.flatMap(l => locationGrouped[l] ?? []);
    return rows.length ? Math.max(...rows.map(r => r.avgTotalCompensation ?? 0), 1) : 1;
  }, [visibleLocations, locationGrouped]);

  const maxCoTotal = useMemo(() => {
    const rows = visibleCompanies.flatMap(c => companyGrouped[c] ?? []);
    return rows.length ? Math.max(...rows.map(r => r.avgTotalCompensation ?? 0), 1) : 1;
  }, [visibleCompanies, companyGrouped]);

  return (
    <section className="section">
      <style>{`
        @keyframes progressCrawl {
          0%   { width: 0%;  }
          40%  { width: 65%; }
          70%  { width: 82%; }
          100% { width: 90%; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div className="section-header">
        <span className="section-tag">Analytics</span>
        <h2 className="section-title">360° Compensation <em>Intelligence</em></h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>
          Aggregated salary data across all approved submissions
        </p>
      </div>

      {initialLoading ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          color: 'var(--text-3)',
          fontFamily: "'IBM Plex Mono',monospace", fontSize: 13,
        }}>
          Loading analytics…
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 12,
        }}>

          {/* ══════════════════════════════════════════════════════════════
              CHART 1 — Avg Salary by Location × Internal Level
          ══════════════════════════════════════════════════════════════ */}
          <div className="chart-card">

            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
              <div>
                <div className="chart-title">Avg Salary by Location &amp; Level</div>
                <div className="chart-subtitle">
                  {selLocations.length > 0
                    ? `${selLocations.length} location${selLocations.length > 1 ? 's' : ''} selected · hover each bar for breakdown`
                    : 'All locations · hover each bar for Base · Bonus · Equity'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <MultiFilter
                  label="Filter"
                  items={allLocations}
                  selected={selLocations}
                  onChange={setSelLocations}
                  max={5}
                />
                {selLocations.length > 0 && (
                  <button
                    onClick={() => setSelLocations([])}
                    style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'IBM Plex Mono',monospace" }}
                  >
                    ✕ clear
                  </button>
                )}
              </div>
            </div>

            <Chips items={selLocations} onRemove={loc => setSelLocations(selLocations.filter(l => l !== loc))} />

            <BarLegend />

            {byLocationLevel.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {visibleLocations.map((loc, li) => {
                  const rows  = locationGrouped[loc] ?? [];
                  const color = BAR_COLORS[li % BAR_COLORS.length];
                  return (
                    <div key={loc}>
                      <GroupHeader dot={color} meta={`${rows.length} level${rows.length !== 1 ? 's' : ''}`}>
                        {loc}
                      </GroupHeader>
                      <div className="level-bars">
                        {rows.map(row => (
                          <BarRow
                            key={row.internalLevel}
                            label={row.internalLevel}
                            sublabel={loc}
                            base={row.avgBaseSalary}
                            bonus={row.avgBonus}
                            equity={row.avgEquity}
                            total={row.avgTotalCompensation}
                            count={row.count}
                            maxTotal={maxLocTotal}
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

          {/* ══════════════════════════════════════════════════════════════
              CHART 2 — Avg Salary by Company × Internal Level
          ══════════════════════════════════════════════════════════════ */}
          <div className="chart-card">

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
              <div>
                <div className="chart-title">Avg Salary by Company &amp; Level</div>
                <div className="chart-subtitle">
                  {selLocationsForCompany.length > 0 || selLevels.length > 0
                    ? `${selLocationsForCompany.length > 0 ? selLocationsForCompany.length + ' location' + (selLocationsForCompany.length > 1 ? 's' : '') + ' · ' : ''}${selCompanies.length > 0 ? selCompanies.length + ' companies' : 'all companies'}${selLevels.length > 0 ? ' · ' + selLevels.length + ' level' + (selLevels.length > 1 ? 's' : '') : ''} · hover for breakdown`
                    : 'Hover each bar for Base · Bonus · Equity breakdown'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <MultiFilter
                    label="Location"
                    items={ALL_LOCATIONS}
                    selected={selLocationsForCompany}
                    onChange={setSelLocationsForCompany}
                    max={5}
                  />
                  <MultiFilter
                    label="Company"
                    items={allCompanyNames}
                    selected={selCompanies}
                    onChange={setSelCompanies}
                    max={5}
                  />
                  <MultiFilter
                    label="Level"
                    items={allLevelNames}
                    selected={selLevels}
                    onChange={setSelLevels}
                    max={5}
                  />
                </div>
                {(selLocationsForCompany.length > 0 || selCompanies.length > 0 || selLevels.length > 0) && (
                  <button
                    onClick={() => { setSelLocationsForCompany([]); setSelCompanies([]); setSelLevels([]); }}
                    style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'IBM Plex Mono',monospace" }}
                  >
                    ✕ clear all
                  </button>
                )}
              </div>
            </div>

            {/* Active filter chips — locations, companies, levels */}
            <Chips
              items={selLocationsForCompany}
              onRemove={loc => setSelLocationsForCompany(selLocationsForCompany.filter(l => l !== loc))}
            />
            <Chips
              items={selCompanies}
              onRemove={c => setSelCompanies(selCompanies.filter(x => x !== c))}
            />
            <Chips
              items={selLevels}
              onRemove={l => setSelLevels(selLevels.filter(x => x !== l))}
            />

            {/* Progress bar — crawls while backend re-fetches, invisible otherwise */}
            <div style={{ height: 3, marginBottom: 8, borderRadius: 99, overflow: 'hidden', background: refetching ? 'rgba(59,130,246,0.12)' : 'transparent', transition: 'background 0.2s' }}>
              {refetching && (
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
                  borderRadius: 99,
                  animation: 'progressCrawl 2s cubic-bezier(0.05, 0.6, 0.4, 1) forwards',
                }} />
              )}
            </div>

            <BarLegend />

            {byCompanyLevel.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {visibleCompanies.map((company, ci) => {
                  const allRows  = companyGrouped[company] ?? [];
                  const rows     = selLevels.length > 0
                    ? allRows.filter(r => selLevels.includes(r.internalLevel))
                    : allRows;
                  if (rows.length === 0) return null; // hide company entirely if no matching levels
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
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>{company}</span>
                        <ConfidenceBadge tier={firstRow?.confidenceTier} label={firstRow?.confidenceLabel} />
                      </div>
                      <div className="level-bars">
                        {rows.map(row => (
                          <BarRow
                            key={row.internalLevel}
                            label={row.internalLevel}
                            sublabel={company}
                            base={row.avgBaseSalary}
                            bonus={row.avgBonus}
                            equity={row.avgEquity}
                            total={row.avgTotalCompensation}
                            count={row.count}
                            maxTotal={maxCoTotal}
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

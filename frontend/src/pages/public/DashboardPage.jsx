import { useState, useEffect, useRef, useMemo } from 'react';
import React from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useLocations } from '../../hooks/useLocations';

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
function BarLegend({ isMobile = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14, marginBottom: 10, flexWrap: 'wrap' }}>
      {[['base','Base'],['bonus','Bonus'],['equity','Equity']].map(([key, label]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: isMobile ? 18 : 24, height: isMobile ? 6 : 8, borderRadius: 4,
            background: PALETTE[key].grad,
          }} />
          <span style={{ fontSize: isMobile ? 9 : 10, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
        </div>
      ))}
      {isMobile && (
        <span style={{ fontSize: 9, color: 'var(--text-3)', marginLeft: 'auto', fontStyle: 'italic', opacity: 0.7 }}>tap row for details</span>
      )}
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
function BarRow({ label, sublabel, base, bonus, equity, total, count, maxTotal, labelWidth = 110, isMobile = false }) {
  const [tip, setTip]     = useState(false);
  const [tipX, setTipX]   = useState('50%');
  const rowRef            = useRef(null);

  function onEnter(e) {
    setTip(true);
    const card = rowRef.current?.closest('.chart-card');
    if (card) {
      const cardRect = card.getBoundingClientRect();
      const rawX     = e.clientX - cardRect.left;
      const clamped  = Math.max(100, Math.min(rawX, cardRect.width - 100));
      setTipX(clamped + 'px');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ── Main row ── */}
      <div
        ref={rowRef}
        className="level-bar-row"
        style={{ cursor: isMobile ? 'pointer' : 'default' }}
        onMouseEnter={!isMobile ? onEnter : undefined}
        onMouseLeave={!isMobile ? () => setTip(false) : undefined}
        onClick={isMobile ? () => setTip(v => !v) : undefined}
      >
        {/* Label — fixed width, clipped if needed */}
        <span
          className="level-bar-label"
          style={{
            width: labelWidth,
            minWidth: labelWidth,
            maxWidth: labelWidth,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: isMobile ? 10 : 11,
          }}
          title={label}
        >{label}</span>

        {/* Stacked bar */}
        <StackedBar base={base} bonus={bonus} equity={equity} total={total} maxTotal={maxTotal} />

        {/* Total value */}
        <span className="level-bar-val" style={{ fontSize: isMobile ? 10 : 11, minWidth: isMobile ? 44 : 52 }}>
          {fmt(total || base)}
        </span>

        {/* Desktop tooltip */}
        {!isMobile && tip && (
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

      {/* Mobile inline breakdown — shown when row is tapped */}
      {isMobile && tip && (
        <div style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '8px 10px',
          marginTop: 4,
          marginBottom: 2,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {[['base','Base',base],['bonus','Bonus',bonus],['equity','Equity',equity]].map(([key, lbl, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 18, height: 6, borderRadius: 3, background: PALETTE[key].grad, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{lbl}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace", marginLeft: 2 }}>
                {fmt(val)}
              </span>
            </div>
          ))}
          {count != null && (
            <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", marginLeft: 'auto' }}>
              {count} {count === 1 ? 'entry' : 'entries'}
            </span>
          )}
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
function MultiFilter({ label, items, selected, onChange, max = 5, isMobile = false }) {
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
        display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6,
        padding: isMobile ? '4px 8px' : '5px 10px', borderRadius: 8,
        background: open ? 'var(--bg-3)' : 'var(--bg-2)',
        border: `1px solid ${selected.length > 0 ? '#3b82f680' : 'var(--border)'}`,
        cursor: 'pointer', fontSize: isMobile ? 10 : 11, color: 'var(--text-2)',
        fontFamily: "'IBM Plex Mono',monospace",
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
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
function GroupHeader({ dot, children, meta, isMobile = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      {dot && (
        <div style={{
          width: isMobile ? 6 : 8, height: isMobile ? 6 : 8, borderRadius: '50%',
          background: dot, flexShrink: 0,
          boxShadow: `0 0 0 3px ${dot}28`,
        }} />
      )}
      <span style={{ fontSize: isMobile ? 11 : 12, fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>{children}</span>
      {meta && <span style={{ fontSize: isMobile ? 9 : 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>{meta}</span>}
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */
function EmptyState({ filtered = false, filterLabel = '' }) {
  return (
    <div style={{
      textAlign: 'center', padding: '36px 16px',
      background: 'var(--bg-2)', borderRadius: 12,
      border: '1px dashed var(--border)',
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>
        {filtered ? '🔍' : '📭'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
        {filtered
          ? `No salary data for ${filterLabel || 'this selection'} yet`
          : 'No data available yet'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
        {filtered
          ? 'Be the first to contribute data for this location and help the community.'
          : 'Salary data will appear here once submissions are approved.'}
      </div>
      <a
        href="/submit"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 18px', borderRadius: 8,
          background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
          color: '#fff', fontSize: 12, fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        + Submit your salary
      </a>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const isMobile = useIsMobile();
  const { locations: ALL_LOCATIONS_RAW } = useLocations();
  const ALL_LOCATIONS = ALL_LOCATIONS_RAW.map(l => l.label);

  /* ── Data state ── */
  const [byLocationLevel, setByLocationLevel] = useState([]);
  const [byCompanyLevel,  setByCompanyLevel]  = useState([]);
  const [byYoe,           setByYoe]           = useState([]);
  const [totalEntries,    setTotalEntries]     = useState(null);
  const [thisMonth,       setThisMonth]        = useState(null);
  const [initialLoading,  setInitialLoading]   = useState(true);
  const [refetching,      setRefetching]       = useState(false);

  /* ── Filter state ── */
  const [selLocations,           setSelLocations]           = useState([]);
  const [selCompanies,           setSelCompanies]           = useState([]);
  const [selLocationsForCompany, setSelLocationsForCompany] = useState([]);
  const [selLevels,              setSelLevels]              = useState([]);

  /* ── Company filter fetch ── */
  const fetchCompanyLevel = React.useCallback(() => {
    const params = selLocationsForCompany.length > 0 ? { locations: selLocationsForCompany } : {};
    return api.get('/public/salaries/analytics/by-company-level', { params });
  }, [selLocationsForCompany]);

  /* ── Initial load — all data + header stats in parallel ── */
  useEffect(() => {
    Promise.all([
      api.get('/public/salaries/analytics/by-location-level'),
      api.get('/public/salaries/analytics/by-company-level'),
      api.get('/public/salaries/analytics/by-yoe'),
      api.get('/public/salaries', { params: { page: 0, size: 1 } }),
      api.get('/public/salaries/stats/this-month'),
    ]).then(([locLvl, cl, yoe, salaries, month]) => {
      setByLocationLevel(locLvl.data?.data ?? []);
      setByCompanyLevel(cl.data?.data      ?? []);
      setByYoe(yoe.data?.data             ?? []);
      setTotalEntries(salaries.data?.data?.totalElements ?? null);
      setThisMonth(month.data?.data ?? null);
    }).catch(console.error)
      .finally(() => setInitialLoading(false));
  }, []);

  /* ── Re-fetch company chart on location filter change ── */
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setRefetching(true);
    fetchCompanyLevel()
      .then(cl => setByCompanyLevel(cl.data?.data ?? []))
      .catch(console.error)
      .finally(() => setRefetching(false));
  }, [fetchCompanyLevel]);

  /* ── Derived data ── */
  const locationGrouped = useMemo(() =>
    byLocationLevel.reduce((acc, row) => {
      if (!acc[row.location]) acc[row.location] = [];
      acc[row.location].push(row);
      return acc;
    }, {}),
  [byLocationLevel]);

  const companyGrouped = useMemo(() =>
    byCompanyLevel.reduce((acc, row) => {
      if (!acc[row.companyName]) acc[row.companyName] = [];
      acc[row.companyName].push(row);
      return acc;
    }, {}),
  [byCompanyLevel]);

  const allLocations    = ALL_LOCATIONS;
  const allCompanyNames = useMemo(() => Object.keys(companyGrouped), [companyGrouped]);
  const allLevelNames   = useMemo(() => {
    const seen = new Set();
    byCompanyLevel.forEach(row => { if (row.internalLevel) seen.add(row.internalLevel); });
    const ORDER = ['SDE 1','SDE 2','SDE 3','Staff Engineer','Principal Engineer','Architect',
                   'Engineering Manager','Sr. Engineering Manager','Director','Sr. Director','VP'];
    return [...seen].sort((a, b) => {
      const ai = ORDER.indexOf(a); const bi = ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1; if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [byCompanyLevel]);

  const visibleLocations = selLocations.length > 0
    ? selLocations.filter(l => locationGrouped[l])
    : allLocations;

  const visibleCompanies = selCompanies.length > 0
    ? selCompanies.filter(c => companyGrouped[c])
    : allCompanyNames.slice(0, 6);

  const maxLocTotal = useMemo(() => {
    const rows = visibleLocations.flatMap(l => locationGrouped[l] ?? []);
    return rows.length ? Math.max(...rows.map(r => r.avgTotalCompensation ?? 0), 1) : 1;
  }, [visibleLocations, locationGrouped]);

  const maxCoTotal = useMemo(() => {
    const rows = visibleCompanies.flatMap(c => companyGrouped[c] ?? []);
    return rows.length ? Math.max(...rows.map(r => r.avgTotalCompensation ?? 0), 1) : 1;
  }, [visibleCompanies, companyGrouped]);

  /* ── Helpers ── */
  const fmtCount = n => {
    if (n == null) return '—';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k+';
    return n.toLocaleString('en-IN');
  };

  /* ── Median TC from location data ── */
  const medianTC = useMemo(() => {
    const vals = byLocationLevel.map(r => r.avgTotalCompensation).filter(Boolean);
    if (!vals.length) return null;
    const sorted = [...vals].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }, [byLocationLevel]);

  const numCompanies = useMemo(() => new Set(byCompanyLevel.map(r => r.companyName)).size, [byCompanyLevel]);

  /* ── Spinner animation ── */
  const spinStyle = { width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--border)', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite' };

  return (
    <div style={{ background: 'var(--bg-2)', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progressCrawl { 0%{width:0%} 40%{width:65%} 70%{width:82%} 100%{width:90%} }

        /* ── Command-centre header ── */
        .cc-header {
          background: var(--panel);
          border-bottom: 1px solid var(--border);
          padding: 28px 32px 24px;
        }
        .cc-header-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .cc-tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #3b82f6;
          margin-bottom: 6px;
          display: block;
        }
        .cc-title {
          font-size: clamp(18px, 3vw, 24px);
          font-weight: 700;
          color: var(--text-1);
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }
        .cc-title em { font-style: normal; color: #3b82f6; }
        .cc-sub {
          font-size: 12px;
          color: var(--text-3);
          font-family: 'IBM Plex Mono', monospace;
        }
        .cc-stats {
          display: flex;
          align-items: center;
          gap: 0;
          flex-shrink: 0;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
        }
        .cc-stat {
          padding: 12px 20px;
          border-right: 1px solid var(--border);
          text-align: right;
        }
        .cc-stat:last-child { border-right: none; }
        .cc-stat-label {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-3);
          font-family: 'IBM Plex Mono', monospace;
          margin-bottom: 3px;
        }
        .cc-stat-val {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-1);
          font-family: 'IBM Plex Mono', monospace;
          line-height: 1;
        }
        .cc-stat-val.blue { color: #3b82f6; }

        /* ── Page body ── */
        .cc-body {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px 32px 60px;
        }

        /* ── Chart grid: 2-col on desktop ── */
        .cc-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        /* ── Mobile overrides ── */
        @media (max-width: 768px) {
          .cc-header { padding: 20px 16px 18px; }
          .cc-header-inner {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
          }
          .cc-stats {
            width: 100%;
            border-radius: 8px;
            flex-shrink: 0;
          }
          .cc-stat { flex: 1; padding: 10px 8px; text-align: center; }
          .cc-stat-val { font-size: 15px; }
          .cc-stat-label { font-size: 8px; }
          .cc-body { padding: 14px 16px 48px; }
          .cc-charts-grid { grid-template-columns: 1fr; gap: 10px; }
        }
        @media (max-width: 390px) {
          .cc-stat { padding: 8px 4px; }
          .cc-stat-val { font-size: 13px; }
        }
      `}</style>

      {/* ══════════════════════════════════════
          COMMAND-CENTRE HEADER
      ══════════════════════════════════════ */}
      <div className="cc-header">
        <div className="cc-header-inner">
          <div>
            <span className="cc-tag">Analytics</span>
            <div className="cc-title">360° Compensation <em>Intelligence</em></div>
            <div className="cc-sub">Aggregated across all approved submissions · updated hourly</div>
          </div>
          <div className="cc-stats">
            <div className="cc-stat">
              <div className="cc-stat-label">Entries</div>
              <div className="cc-stat-val">{initialLoading ? '—' : fmtCount(totalEntries)}</div>
            </div>
            <div className="cc-stat">
              <div className="cc-stat-label">This month</div>
              <div className="cc-stat-val">{initialLoading ? '—' : (thisMonth ?? '—')}</div>
            </div>
            <div className="cc-stat">
              <div className="cc-stat-label">Companies</div>
              <div className="cc-stat-val">{initialLoading ? '—' : (numCompanies || '—')}</div>
            </div>
            <div className="cc-stat">
              <div className="cc-stat-label">Median TC</div>
              <div className="cc-stat-val blue">{initialLoading ? '—' : fmt(medianTC)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          PAGE BODY
      ══════════════════════════════════════ */}
      <div className="cc-body">

        {initialLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 14 }}>
            <div style={spinStyle} />
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>Loading analytics…</span>
          </div>
        ) : (
          <>
            {/* ── 2-col chart grid ── */}
            <div className="cc-charts-grid">

              {/* ── CHART 1: Location × Level ── */}
              <div className="chart-card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="chart-title">Salary by Location &amp; Level</div>
                    <div className="chart-subtitle">
                      {selLocations.length > 0
                        ? `${selLocations.length} location${selLocations.length > 1 ? 's' : ''} selected · ${isMobile ? 'tap' : 'hover'} for breakdown`
                        : `All locations · ${isMobile ? 'tap a bar' : 'hover each bar'} for Base · Bonus · Equity`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                    <MultiFilter label="Location" items={allLocations} selected={selLocations} onChange={setSelLocations} max={5} isMobile={isMobile} />
                    {selLocations.length > 0 && (
                      <button onClick={() => setSelLocations([])} style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'IBM Plex Mono',monospace" }}>✕ clear</button>
                    )}
                  </div>
                </div>

                <Chips items={selLocations} onRemove={loc => setSelLocations(selLocations.filter(l => l !== loc))} />
                <BarLegend isMobile={isMobile} />

                {byLocationLevel.length === 0 ? <EmptyState /> :
                 visibleLocations.length === 0 ? <EmptyState filtered filterLabel={selLocations.join(', ')} /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {visibleLocations.map((loc, li) => {
                      const rows  = locationGrouped[loc] ?? [];
                      const color = BAR_COLORS[li % BAR_COLORS.length];
                      return (
                        <div key={loc}>
                          <GroupHeader dot={color} meta={`${rows.length} level${rows.length !== 1 ? 's' : ''}`} isMobile={isMobile}>{loc}</GroupHeader>
                          <div className="level-bars">
                            {rows.map(row => (
                              <BarRow key={row.internalLevel} label={row.internalLevel} sublabel={loc}
                                base={row.avgBaseSalary} bonus={row.avgBonus} equity={row.avgEquity}
                                total={row.avgTotalCompensation} count={row.count}
                                maxTotal={maxLocTotal} labelWidth={isMobile ? 72 : 130} isMobile={isMobile} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── CHART 2: Company × Level ── */}
              <div className="chart-card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="chart-title">Salary by Company &amp; Level</div>
                    <div className="chart-subtitle">
                      {selLocationsForCompany.length > 0 || selLevels.length > 0
                        ? `${selLocationsForCompany.length > 0 ? selLocationsForCompany.length + ' loc · ' : ''}${selCompanies.length > 0 ? selCompanies.length + ' companies' : 'all companies'}${selLevels.length > 0 ? ' · ' + selLevels.length + ' level' + (selLevels.length > 1 ? 's' : '') : ''}`
                        : `${isMobile ? 'Tap a bar' : 'Hover each bar'} for Base · Bonus · Equity breakdown`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, width: isMobile ? '100%' : undefined, flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end', width: '100%' }}>
                      <MultiFilter label="Location" items={ALL_LOCATIONS}      selected={selLocationsForCompany} onChange={setSelLocationsForCompany} max={5} isMobile={isMobile} />
                      <MultiFilter label="Company"  items={allCompanyNames}    selected={selCompanies}           onChange={setSelCompanies}           max={5} isMobile={isMobile} />
                      <MultiFilter label="Level"    items={allLevelNames}      selected={selLevels}              onChange={setSelLevels}              max={5} isMobile={isMobile} />
                    </div>
                    {(selLocationsForCompany.length > 0 || selCompanies.length > 0 || selLevels.length > 0) && (
                      <button onClick={() => { setSelLocationsForCompany([]); setSelCompanies([]); setSelLevels([]); }}
                        style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'IBM Plex Mono',monospace", alignSelf: isMobile ? 'flex-start' : 'flex-end' }}>
                        ✕ clear all
                      </button>
                    )}
                  </div>
                </div>

                <Chips items={selLocationsForCompany} onRemove={loc => setSelLocationsForCompany(selLocationsForCompany.filter(l => l !== loc))} />
                <Chips items={selCompanies}           onRemove={c   => setSelCompanies(selCompanies.filter(x => x !== c))} />
                <Chips items={selLevels}              onRemove={l   => setSelLevels(selLevels.filter(x => x !== l))} />

                {/* Progress bar for refetch */}
                <div style={{ height: 3, marginBottom: 8, borderRadius: 99, overflow: 'hidden', background: refetching ? 'rgba(59,130,246,0.12)' : 'transparent', transition: 'background 0.2s' }}>
                  {refetching && (
                    <div style={{ height: '100%', background: 'linear-gradient(90deg,#60a5fa,#3b82f6)', borderRadius: 99, animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
                  )}
                </div>

                <BarLegend isMobile={isMobile} />

                {byCompanyLevel.length === 0 ? <EmptyState /> :
                 visibleCompanies.length === 0 ? <EmptyState filtered filterLabel={selLocationsForCompany.join(', ')} /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {visibleCompanies.map((company, ci) => {
                      const allRows = companyGrouped[company] ?? [];
                      const rows    = selLevels.length > 0 ? allRows.filter(r => selLevels.includes(r.internalLevel)) : allRows;
                      if (rows.length === 0) return null;
                      const firstRow = rows[0];
                      const color    = BAR_COLORS[ci % BAR_COLORS.length];
                      return (
                        <div key={company}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <CompanyLogo companyId={firstRow?.companyId} companyName={company} logoUrl={firstRow?.logoUrl} website={firstRow?.website} size={20} radius={4} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>{company}</span>
                            <ConfidenceBadge tier={firstRow?.confidenceTier} label={firstRow?.confidenceLabel} />
                          </div>
                          <div className="level-bars">
                            {rows.map(row => (
                              <BarRow key={row.internalLevel} label={row.internalLevel} sublabel={company}
                                base={row.avgBaseSalary} bonus={row.avgBonus} equity={row.avgEquity}
                                total={row.avgTotalCompensation} count={row.count}
                                maxTotal={maxCoTotal} labelWidth={isMobile ? 72 : 130} isMobile={isMobile} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── CHART 3: YOE — full width ── */}
            <div className="chart-card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div className="chart-title">Total Comp vs Years of Experience</div>
                  <div className="chart-subtitle">Average total compensation at each YOE · hover a point for details</div>
                </div>
              </div>

              {byYoe.length === 0 ? <EmptyState /> : (() => {
                const fmtV   = v => { if (!v) return '—'; const l = v/100000; return l>=100?`₹${(l/100).toFixed(1)}Cr`:`₹${l.toFixed(1)}L`; };
                const points = byYoe.filter(d => d.avgTotalCompensation != null);
                const maxTotal = Math.max(...points.map(d => d.avgTotalCompensation), 1);
                const minTotal = Math.min(...points.map(d => d.avgTotalCompensation));
                const svgW = 800, H = 200, PAD_L = 56, PAD_R = 16, PAD_T = 12, PAD_B = 32;
                const innerW = svgW - PAD_L - PAD_R;
                const innerH = H - PAD_T - PAD_B;
                const toX = i => PAD_L + (i / Math.max(points.length - 1, 1)) * innerW;
                const toY = v => PAD_T + innerH - ((v - minTotal) / Math.max(maxTotal - minTotal, 1)) * innerH;
                const linePath = points.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.avgTotalCompensation).toFixed(1)}`).join(' ');
                const areaPath = points.length > 0 ? `${linePath} L ${toX(points.length-1).toFixed(1)} ${H-PAD_B} L ${toX(0).toFixed(1)} ${H-PAD_B} Z` : '';

                return (
                  <div style={{ position: 'relative', overflowX: 'auto' }}>
                    <svg viewBox={`0 0 ${svgW} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="yoeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>
                      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                        const y = PAD_T + innerH * (1 - pct);
                        const val = minTotal + pct * (maxTotal - minTotal);
                        return (
                          <g key={pct}>
                            <line x1={PAD_L} y1={y} x2={svgW - PAD_R} y2={y} stroke="var(--border,#e5e7eb)" strokeWidth="0.5" strokeDasharray="3 3" />
                            <text x={PAD_L - 6} y={y + 4} textAnchor="end" style={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>{fmtV(val)}</text>
                          </g>
                        );
                      })}
                      <path d={areaPath} fill="url(#yoeGrad)" />
                      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                      {points.map((d, i) => {
                        const cx = toX(i), cy = toY(d.avgTotalCompensation);
                        const tipX = cx > svgW - 160 ? cx - 145 : cx + 10;
                        return (
                          <g key={d.yoe} className="yoe-point" style={{ cursor: 'default' }}>
                            <circle cx={cx} cy={cy} r={5} fill="#3b82f6" stroke="var(--panel,#fff)" strokeWidth="1.5" />
                            <circle cx={cx} cy={cy} r={12} fill="transparent" />
                            <g className="yoe-tip" style={{ pointerEvents: 'none' }}>
                              <rect x={tipX} y={cy - 56} width={136} height={54} rx="6" fill="var(--panel,#fff)" stroke="var(--border,#e5e7eb)" strokeWidth="0.5" />
                              <text x={tipX + 8} y={cy - 39} style={{ fontSize: 11, fontWeight: 600, fill: 'var(--text-1)', fontFamily: 'sans-serif' }}>{d.yoe} year{d.yoe !== 1 ? 's' : ''} exp</text>
                              <text x={tipX + 8} y={cy - 24} style={{ fontSize: 10, fill: 'var(--text-2)', fontFamily: "'IBM Plex Mono',monospace" }}>TC: {fmtV(d.avgTotalCompensation)}</text>
                              <text x={tipX + 8} y={cy - 11} style={{ fontSize: 9,  fill: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>{d.count} {d.count === 1 ? 'entry' : 'entries'}</text>
                            </g>
                          </g>
                        );
                      })}
                      {points.map((d, i) => {
                        if (i % 2 !== 0 && i !== points.length - 1) return null;
                        return (
                          <text key={d.yoe} x={toX(i)} y={H - PAD_B + 14} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
                            {d.yoe}yr
                          </text>
                        );
                      })}
                    </svg>
                    <style>{`
                      .yoe-point .yoe-tip { opacity: 0; transition: opacity 0.1s; }
                      .yoe-point:hover .yoe-tip { opacity: 1; }
                    `}</style>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

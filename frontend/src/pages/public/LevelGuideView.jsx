import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import TopProgressBar from '../../components/shared/TopProgressBar';

const MAX_COMPANIES = 5;

/* ── Perceptually distinct palette — maximally spaced on the colour wheel ── */
const ACCENT = [
  '#3b82f6',  // 1 — blue      (viz-1)
  '#8b5cf6',  // 2 — violet    (viz-2 / purple)
  '#06b6d4',  // 3 — cyan      (viz-3)
  '#e11d48',  // 4 — rose      (--rose)
  '#d97706',  // 5 — amber     (--gold)
];

/* ── Dim fills for chips and hover states ─────────────────────────────────── */
const ACCENT_DIM = [
  'rgba(59,130,246,0.10)',
  'rgba(139,92,246,0.10)',
  'rgba(6,182,212,0.10)',
  'rgba(225,29,72,0.10)',
  'rgba(217,119,6,0.10)',
];
const ACCENT_BORDER = [
  'rgba(59,130,246,0.35)',
  'rgba(139,92,246,0.35)',
  'rgba(6,182,212,0.35)',
  'rgba(225,29,72,0.35)',
  'rgba(217,119,6,0.35)',
];

function hexRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

/* ─── Tooltip ─────────────────────────────────────────────────────────────── */
function Tooltip({ text, detail, style }) {
  return (
    <div style={{
      position: 'fixed', zIndex: 9999, pointerEvents: 'none',
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '8px 12px',
      boxShadow: '0 4px 20px rgba(0,0,0,.15)',
      minWidth: 160, maxWidth: 260,
      ...style,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: detail ? 4 : 0 }}>{text}</div>
      {detail && <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{detail}</div>}
    </div>
  );
}

/* ─── Overlap Dot — redesigned ────────────────────────────────────────────── */
function OverlapDot({ color, short, title, overlapPct, onHover, onLeave }) {
  const isExact = overlapPct === 100;
  const [r, g, b] = hexRgb(color);

  /* Exact: full-opacity border + medium fill — crisp, confident */
  /* Partial: solid border, lighter fill — still legible, not "broken" */
  const size     = isExact ? 36 : Math.round(22 + (overlapPct / 100) * 16);
  const fillAlpha = isExact ? 0.18 : 0.10 + (overlapPct / 100) * 0.14;
  const borderW  = isExact ? '2px' : '1.5px';
  const borderA  = isExact ? 1.0  : 0.55 + (overlapPct / 100) * 0.35;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'default' }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Main circle */}
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: `rgba(${r},${g},${b},${fillAlpha})`,
          border: `${borderW} solid rgba(${r},${g},${b},${borderA})`,
          boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.max(Math.round(size * 0.27), 8),
          fontWeight: 700,
          color: `rgb(${r},${g},${b})`,
          fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: '-0.02em',
        }}>
          {short}
        </div>

        {/* Percentage badge — only on partial overlaps */}
        {!isExact && (
          <div style={{
            position: 'absolute', top: -5, right: -7,
            background: `rgb(${r},${g},${b})`,
            color: '#fff',
            fontSize: 8, fontWeight: 700,
            padding: '1px 4px', borderRadius: 4,
            fontFamily: "'JetBrains Mono',monospace",
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
          }}>
            {overlapPct}%
          </div>
        )}
      </div>

      {/* Title label */}
      <div style={{
        fontSize: 9, fontWeight: 600,
        color: `rgb(${r},${g},${b})`,
        maxWidth: 64, textAlign: 'center',
        overflow: 'hidden', textOverflow: 'ellipsis',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        lineHeight: 1.3,
        fontFamily: "'JetBrains Mono',monospace",
      }}>
        {title}
      </div>
    </div>
  );
}

/* ─── Comparison Grid ─────────────────────────────────────────────────────── */
function ComparisonGrid({ grid, standardLevels, companies }) {
  const [tooltip, setTooltip] = useState(null);

  if (!standardLevels.length || !companies.length) return null;

  const companyShort = {};
  companies.forEach(c => {
    // Smart short: initials if multi-word, else first 2 chars
    const words = c.name.trim().split(/\s+/);
    companyShort[c.id] = words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : c.name.slice(0, 2).toUpperCase();
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Legend */}
      <div style={{
        display: 'flex', gap: 20, flexWrap: 'wrap',
        padding: '12px 18px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-2)', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>Key</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-3)' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,.16)', border: '2px solid rgba(59,130,246,1)', boxSizing: 'border-box' }} />
          Exact match
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-3)' }}>
          <div style={{ position: 'relative', width: 20, height: 20 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(59,130,246,.10)', border: '1.5px solid rgba(59,130,246,.7)', boxSizing: 'border-box', marginTop: 2 }} />
            <div style={{ position: 'absolute', top: -1, right: -4, background: '#3b82f6', color: '#fff', fontSize: 7, fontWeight: 700, padding: '0 2px', borderRadius: 3 }}>60%</div>
          </div>
          Partial span
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-3)' }}>
          Larger dot = higher % at this level
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {companies.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: ACCENT[i % ACCENT.length] }} />
              <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
        <thead>
          <tr>
            <th style={{
              padding: '10px 18px', textAlign: 'left',
              fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
              fontFamily: "'JetBrains Mono',monospace",
              textTransform: 'uppercase', letterSpacing: '0.09em',
              borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
              whiteSpace: 'nowrap', minWidth: 160,
            }}>
              Standard level
            </th>
            {companies.map((c, i) => (
              <th key={c.id} style={{
                padding: '10px 12px', textAlign: 'center',
                borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
                minWidth: 110,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={24} radius={6} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT[i % ACCENT.length], whiteSpace: 'nowrap' }}>{c.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standardLevels.map((sl, rowIdx) => {
            const rowCells = grid[sl.id] ?? {};
            const hasAny = companies.some(c => (rowCells[c.id] ?? []).length > 0);
            if (!hasAny) return null;

            return (
              <tr key={sl.id} style={{ background: rowIdx % 2 === 0 ? 'transparent' : 'var(--bg-2)' }}>
                {/* Standard level */}
                <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 5, height: 28, borderRadius: 99,
                      background: 'linear-gradient(180deg,#3b82f6,#8b5cf6)',
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{sl.name}</div>
                      {sl.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sl.description}</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Company cells */}
                {companies.map((c, ci) => {
                  const cells = rowCells[c.id] ?? [];
                  const color = ACCENT[ci % ACCENT.length];
                  const short = companyShort[c.id];

                  return (
                    <td key={c.id} style={{
                      padding: '10px 8px', textAlign: 'center',
                      borderBottom: '1px solid var(--border)',
                      verticalAlign: 'middle',
                    }}>
                      {cells.length === 0 ? (
                        <span style={{ color: 'var(--border)', fontSize: 16, lineHeight: 1 }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'flex-end' }}>
                          {cells.map((cell, ci2) => (
                            <OverlapDot
                              key={ci2}
                              color={color}
                              short={short}
                              title={cell.title}
                              overlapPct={cell.overlapPct ?? 100}
                              onHover={e => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pct = cell.overlapPct ?? 100;
                                const detail = pct < 100
                                  ? `${pct}% of ${c.name}'s "${cell.title}" sits at ${sl.name} level`
                                  : `"${cell.title}" maps exactly to ${sl.name}`;
                                setTooltip({ x: rect.right + 8, y: rect.top, text: `${c.name} · ${cell.title}`, detail });
                              }}
                              onLeave={() => setTooltip(null)}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {tooltip && (
        <Tooltip text={tooltip.text} detail={tooltip.detail} style={{ left: tooltip.x, top: tooltip.y }} />
      )}
    </div>
  );
}

/* ─── Multi-select Company Combo ──────────────────────────────────────────── */
function CompanyCombo({ selected, onChange }) {
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [panelOpen,   setPanelOpen]   = useState(false);
  const debounceRef  = useRef(null);
  const wrapRef      = useRef(null);
  const inputRef     = useRef(null);

  /* Close panel on outside click */
  useEffect(() => {
    function h(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setPanelOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* Search on query change */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      api.get('/public/companies', { params: { name: query, size: 10, page: 0 } })
        .then(r => setResults(r.data?.data?.content ?? []))
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function toggle(company) {
    const alreadyIn = selected.find(s => s.id === company.id);
    if (alreadyIn) {
      onChange(selected.filter(s => s.id !== company.id));
    } else {
      if (selected.length >= MAX_COMPANIES) return;
      onChange([...selected, company]);
    }
  }

  function removeChip(id) { onChange(selected.filter(s => s.id !== id)); }

  const remaining = MAX_COMPANIES - selected.length;

  return (
    <div ref={wrapRef}>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
          {selected.map((c, i) => (
            <div key={c.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '5px 10px 5px 7px', borderRadius: 99,
              background: ACCENT_DIM[i % ACCENT_DIM.length],
              border: `1px solid ${ACCENT_BORDER[i % ACCENT_BORDER.length]}`,
            }}>
              <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={18} radius={4} />
              <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT[i % ACCENT.length] }}>{c.name}</span>
              <span
                onClick={() => removeChip(c.id)}
                style={{ cursor: 'pointer', color: ACCENT[i % ACCENT.length], opacity: 0.55, fontSize: 15, lineHeight: 1, fontWeight: 300 }}
              >×</span>
            </div>
          ))}
        </div>
      )}

      {/* Input trigger */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: panelOpen ? '10px 10px 0 0' : 10,
          cursor: 'text',
          borderBottom: panelOpen ? '1px solid transparent' : '1px solid var(--border)',
        }}
        onClick={() => { setPanelOpen(true); inputRef.current?.focus(); }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--text-3)" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setPanelOpen(true); }}
          onFocus={() => setPanelOpen(true)}
          placeholder={
            remaining === 0
              ? 'Max 5 companies selected'
              : `Search companies… (${remaining} slot${remaining !== 1 ? 's' : ''} left)`
          }
          disabled={remaining === 0}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontSize: 13, color: 'var(--text-1)', outline: 'none',
            cursor: remaining === 0 ? 'default' : 'text',
          }}
          autoComplete="off"
        />
        {query && (
          <span
            onClick={e => { e.stopPropagation(); setQuery(''); setResults([]); inputRef.current?.focus(); }}
            style={{ cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
          >×</span>
        )}
        {/* Slot indicators */}
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {Array.from({ length: MAX_COMPANIES }).map((_, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: i < selected.length
                ? ACCENT[i % ACCENT.length]
                : 'var(--border)',
              transition: 'background .2s',
            }} />
          ))}
        </div>
      </div>

      {/* Results panel */}
      {panelOpen && (
        <div style={{
          border: '1px solid var(--border)', borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          background: 'var(--panel)',
          maxHeight: 300, overflowY: 'auto',
        }}>
          {/* No query yet */}
          {query.length < 2 && results.length === 0 && (
            <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
              Type at least 2 characters to search
            </div>
          )}

          {/* Searching spinner */}
          {searching && (
            <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: '100%', height: 2, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '60%', background: '#3b82f6', borderRadius: 99, animation: 'shimmer 1s ease-in-out infinite alternate' }} />
              </div>
              <style>{`@keyframes shimmer{0%{margin-left:0}100%{margin-left:40%}}`}</style>
            </div>
          )}

          {/* Results */}
          {!searching && results.map((company, i) => {
            const checked   = !!selected.find(s => s.id === company.id);
            const checkedIdx = selected.findIndex(s => s.id === company.id);
            const disabled  = !checked && selected.length >= MAX_COMPANIES;
            const accentColor = checked ? ACCENT[checkedIdx % ACCENT.length] : '#3b82f6';

            return (
              <div
                key={company.id}
                onClick={() => !disabled && toggle(company)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                  background: checked ? `${ACCENT_DIM[checkedIdx % ACCENT_DIM.length]}` : 'transparent',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!disabled && !checked) e.currentTarget.style.background = 'var(--bg-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = checked ? ACCENT_DIM[checkedIdx % ACCENT_DIM.length] : 'transparent'; }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${checked ? accentColor : 'var(--border-2)'}`,
                  background: checked ? accentColor : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}>
                  {checked && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                <CompanyLogo companyId={company.id} companyName={company.name} logoUrl={company.logoUrl} website={company.website} size={26} radius={6} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: checked ? 600 : 500, color: checked ? accentColor : 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {company.name}
                  </div>
                  {company.industry && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{company.industry}</div>
                  )}
                </div>

                {/* Slot badge on selected items */}
                {checked && (
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: accentColor, color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {checkedIdx + 1}
                  </div>
                )}
              </div>
            );
          })}

          {/* No results */}
          {!searching && query.length >= 2 && results.length === 0 && (
            <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
              No companies found for "{query}"
            </div>
          )}

          {/* Footer hint */}
          {results.length > 0 && (
            <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--border)', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{selected.length}/{MAX_COMPANIES} selected</span>
              {selected.length > 0 && (
                <span
                  onClick={() => onChange([])}
                  style={{ cursor: 'pointer', color: 'var(--rose)', fontWeight: 500 }}
                >
                  Clear all
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main View ───────────────────────────────────────────────────────────── */
export default function LevelGuideView() {
  const [selected,         setSelected]         = useState([]);
  const [functionCategory, setFunctionCategory] = useState('Engineering');
  const [gridData,         setGridData]         = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState(null);
  const debounceRef = useRef(null);
  const FUNCTIONS = ['Engineering', 'Product', 'Program'];

  const fetchGrid = useCallback((companies) => {
    if (companies.length === 0) { setGridData(null); return; }
    setLoading(true); setError(null); TopProgressBar.start();
    const ids = companies.map(c => c.id);
    api.get('/public/guide-levels/grid', {
      params: { companyIds: ids, functionCategory },
      paramsSerializer: params => {
        const parts = [];
        (params.companyIds ?? []).forEach(id => parts.push(`companyIds=${encodeURIComponent(id)}`));
        if (params.functionCategory) parts.push(`functionCategory=${encodeURIComponent(params.functionCategory)}`);
        return parts.join('&');
      },
    })
      .then(r => setGridData(r.data?.data ?? null))
      .catch(err => {
        const status = err.response?.status;
        const msg    = err.response?.data?.message ?? err.message ?? 'Unknown error';
        setError(`Failed to load level data${status ? ` (${status})` : ''}: ${msg}`);
      })
      .finally(() => { setLoading(false); TopProgressBar.done(); });
  }, [functionCategory]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGrid(selected), 400);
    return () => clearTimeout(debounceRef.current);
  }, [selected, fetchGrid, functionCategory]);

  const hasData = gridData && gridData.standardLevels?.length > 0;

  return (
    <div>
      {/* Selector card */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
            Compare Level Titles Across Companies
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Select up to {MAX_COMPANIES} companies — tick them from search results. Dot size and % show overlap across standard levels.
          </div>
        </div>

        <CompanyCombo selected={selected} onChange={setSelected} />

        {/* Function filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginRight: 4 }}>Function:</span>
          {FUNCTIONS.map(fn => (
            <button key={fn}
              onClick={() => { TopProgressBar.start(); setFunctionCategory(fn); }}
              style={{
                padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: functionCategory === fn ? '#3b82f6' : 'var(--bg-3)',
                color:      functionCategory === fn ? '#fff'    : 'var(--text-3)',
                border:     functionCategory === fn ? '1px solid #3b82f6' : '1px solid var(--border)',
              }}
            >{fn}</button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {selected.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Search and select companies above</div>
          <div style={{ fontSize: 13 }}>Tick up to 5 — their level equivalencies will appear here side by side.</div>
        </div>
      )}

      {/* Loading bar */}
      {selected.length > 0 && loading && (
        <div style={{ padding: '28px 0 24px' }}>
          <div style={{ width: '100%', height: 3, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius: 99, animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
          </div>
          <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 10, color: 'var(--rose)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Grid */}
      {!loading && !error && selected.length > 0 && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {hasData ? (
            <ComparisonGrid
              grid={gridData.grid}
              standardLevels={gridData.standardLevels}
              companies={gridData.companies}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>No level data yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                No <strong>{functionCategory}</strong> level mappings found for {selected.map(c => c.name).join(', ')}.<br/>
                Try a different function track or check back later.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

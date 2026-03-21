import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import TopProgressBar from '../../components/shared/TopProgressBar';

const MAX_COMPANIES = 5;

/**
 * 5-slot ramp palette — each company gets a full colour ramp.
 * fill  : light background (50-stop) for chip/dot fill
 * dot   : mid accent (400-stop) for borders, badges, indicators
 * text  : dark (800-stop) — readable on fill, used inside dots and chips
 * dim   : very light fill for combo panel checked rows
 * border: semi-transparent for chip outlines
 */
const PALETTE = [
  { fill:'#EAF3DE', dot:'#3B6D11', text:'#27500A', dim:'rgba(59,109,17,.08)', border:'rgba(59,109,17,.3)'  }, // green
  { fill:'#E6F1FB', dot:'#185FA5', text:'#0C447C', dim:'rgba(24,95,165,.08)', border:'rgba(24,95,165,.3)'  }, // blue
  { fill:'#EEEDFE', dot:'#534AB7', text:'#3C3489', dim:'rgba(83,74,183,.08)', border:'rgba(83,74,183,.3)'  }, // purple
  { fill:'#FAECE7', dot:'#993C1D', text:'#712B13', dim:'rgba(153,60,29,.08)', border:'rgba(153,60,29,.3)'  }, // coral
  { fill:'#FAEEDA', dot:'#854F0B', text:'#633806', dim:'rgba(133,79,11,.08)', border:'rgba(133,79,11,.3)'  }, // amber
];

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

/* ─── Overlap Dot — ramp-based, title inside ─────────────────────────────── */
function OverlapDot({ palette, title, overlapPct, onHover, onLeave }) {
  const isExact = overlapPct === 100;
  const p       = palette;

  // Exact: full size + full ramp fill. Partial: smaller + reduced opacity.
  const size    = isExact ? 44 : Math.round(30 + (overlapPct / 100) * 16);
  const opacity = isExact ? 1  : 0.5 + (overlapPct / 100) * 0.42;

  // Font size scales with dot — keeps title readable at all sizes
  const fs = Math.max(Math.round(size * 0.28), 9);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'default' }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Circle with title inside */}
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: p.fill,
          border: `2px solid ${p.dot}`,
          boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity,
        }}>
          <span style={{
            fontSize: fs, fontWeight: 700,
            color: p.text,
            fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: '-0.03em',
            lineHeight: 1,
            textAlign: 'center',
            maxWidth: size - 8,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}>
            {title}
          </span>
        </div>

        {/* Percentage badge on partial overlaps */}
        {!isExact && (
          <div style={{
            position: 'absolute', top: -4, right: -9,
            background: p.dot, color: '#fff',
            fontSize: 9, fontWeight: 700,
            padding: '2px 5px', borderRadius: 4,
            fontFamily: "'JetBrains Mono',monospace",
            whiteSpace: 'nowrap', lineHeight: 1.3,
          }}>
            {overlapPct}%
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Comparison Grid ─────────────────────────────────────────────────────── */
function ComparisonGrid({ grid, standardLevels, companies }) {
  const [tooltip, setTooltip] = useState(null);

  if (!standardLevels.length || !companies.length) return null;

  // Assign each company a palette slot by its position in the response
  const palettes = companies.map((_, i) => PALETTE[i % PALETTE.length]);

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Legend + company key */}
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
        padding: '11px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-2)',
      }}>
        {/* Exact match example */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-3)' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#EAF3DE', border: '2px solid #3B6D11',
            boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#27500A',
            fontFamily: "'JetBrains Mono',monospace",
          }}>L4</div>
          Exact match
        </div>
        {/* Partial match example */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-3)' }}>
          <div style={{ position: 'relative', width: 32, height: 24 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: '#EAF3DE', border: '2px solid #3B6D11',
              boxSizing: 'border-box', opacity: 0.65,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: '#27500A',
              fontFamily: "'JetBrains Mono',monospace",
            }}>L5</div>
            <div style={{
              position: 'absolute', top: -3, right: 0,
              background: '#3B6D11', color: '#fff',
              fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 4,
            }}>60%</div>
          </div>
          Partial span
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Smaller = lower %</div>

        {/* Company colour key */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {companies.map((co, i) => {
            const p = palettes[i];
            return (
              <div key={co.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.dot }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: p.text }}>{co.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
        <thead>
          <tr>
            <th style={{
              padding: '10px 20px', textAlign: 'left',
              fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
              whiteSpace: 'nowrap', minWidth: 200,
            }}>
              Standard level
            </th>
            {companies.map((co, i) => {
              const p = palettes[i];
              return (
                <th key={co.id} style={{
                  padding: '10px 12px', textAlign: 'center',
                  borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
                  minWidth: 120, borderLeft: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: p.dot }}>{co.name}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {standardLevels.map((sl, rowIdx) => {
            const rowCells = grid[sl.id] ?? {};
            const hasAny = companies.some(co => (rowCells[co.id] ?? []).length > 0);
            if (!hasAny) return null;

            const rowBg = rowIdx % 2 === 0 ? 'transparent' : 'var(--bg-2)';

            return (
              <tr key={sl.id} style={{ background: rowBg }}>
                {/* Standard level label */}
                <td style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 3, height: 32, borderRadius: 2, flexShrink: 0,
                      background: 'var(--border-2,var(--border))',
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{sl.name}</div>
                      {sl.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sl.description}</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Company cells */}
                {companies.map((co, ci) => {
                  const cells = rowCells[co.id] ?? [];
                  const p     = palettes[ci];

                  return (
                    <td key={co.id} style={{
                      padding: '10px 8px', textAlign: 'center',
                      borderBottom: '1px solid var(--border)',
                      borderLeft: '1px solid var(--border)',
                      verticalAlign: 'middle',
                    }}>
                      {cells.length === 0 ? (
                        <span style={{ color: 'var(--border)', fontSize: 18, lineHeight: 1, fontWeight: 300 }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                          {cells.map((cell, ci2) => {
                            const pct = cell.overlapPct ?? 100;
                            return (
                              <OverlapDot
                                key={ci2}
                                palette={p}
                                title={cell.title}
                                overlapPct={pct}
                                onHover={e => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const detail = pct < 100
                                    ? `${pct}% of ${co.name}'s "${cell.title}" sits at ${sl.name}`
                                    : `"${cell.title}" maps exactly to ${sl.name}`;
                                  setTooltip({ x: rect.right + 8, y: rect.top, text: `${co.name} · ${cell.title}`, detail });
                                }}
                                onLeave={() => setTooltip(null)}
                              />
                            );
                          })}
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
              background: PALETTE[i % PALETTE.length].dim,
              border: `1.5px solid ${PALETTE[i % PALETTE.length].border}`,
            }}>
              <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={18} radius={4} />
              <span style={{ fontSize: 12, fontWeight: 600, color: PALETTE[i % PALETTE.length].text }}>{c.name}</span>
              <span
                onClick={() => removeChip(c.id)}
                style={{ cursor: 'pointer', color: PALETTE[i % PALETTE.length].dot, opacity: 0.65, fontSize: 15, lineHeight: 1, fontWeight: 300 }}
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
                ? PALETTE[i % PALETTE.length].dot
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
            const ramp = checked ? PALETTE[checkedIdx % PALETTE.length] : PALETTE[0];
            const accentColor = checked ? ramp.dot : '#3b82f6';

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
                  background: checked ? ramp.dim : 'transparent',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!disabled && !checked) e.currentTarget.style.background = 'var(--bg-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = checked ? ramp.dim : 'transparent'; }}
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
                  <div style={{ fontSize: 13, fontWeight: checked ? 600 : 500, color: checked ? ramp.text : 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                    background: ramp.dot, color: '#fff',
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

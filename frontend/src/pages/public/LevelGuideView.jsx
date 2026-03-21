import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import TopProgressBar from '../../components/shared/TopProgressBar';

const MAX_COMPANIES = 5;
const ACCENT = ['#4285f4','#0078d4','#f7a600','#e8892b','#8b5cf6'];

/* ─── Tooltip ─────────────────────────────────────────────────────────────── */
function Tooltip({ text, detail, style }) {
  return (
    <div style={{
      position: 'absolute', zIndex: 50, pointerEvents: 'none',
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '8px 12px',
      boxShadow: '0 4px 20px rgba(0,0,0,.13)',
      minWidth: 160, maxWidth: 240,
      ...style,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: detail ? 4 : 0 }}>{text}</div>
      {detail && <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{detail}</div>}
    </div>
  );
}

/* ─── Overlap Dot ─────────────────────────────────────────────────────────── */
function OverlapDot({ color, short, title, overlapPct, onHover, onLeave }) {
  const isExact = overlapPct === 100;
  const alpha   = 0.22 + (overlapPct / 100) * 0.65;
  const size    = isExact ? 36 : 24 + Math.round((overlapPct / 100) * 14);
  const [r, g, b] = hexRgb(color);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'default', position: 'relative' }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: `rgba(${r},${g},${b},${alpha})`,
          border: isExact ? 'none' : `2px dashed rgba(${r},${g},${b},0.7)`,
          boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.round(size * 0.28), fontWeight: 700,
          color: `rgba(${r},${g},${b},1)`,
          fontFamily: "'JetBrains Mono',monospace",
        }}>
          {short}
        </div>
        {!isExact && (
          <div style={{
            position: 'absolute', top: -4, right: -6,
            background: `rgba(${r},${g},${b},0.9)`,
            color: 'white', fontSize: 8, fontWeight: 700,
            padding: '1px 4px', borderRadius: 4,
            fontFamily: "'JetBrains Mono',monospace",
            whiteSpace: 'nowrap',
          }}>
            {overlapPct}%
          </div>
        )}
      </div>
      <div style={{
        fontSize: 9, fontWeight: 600,
        color: `rgba(${r},${g},${b},0.9)`,
        whiteSpace: 'nowrap', maxWidth: 56,
        overflow: 'hidden', textOverflow: 'ellipsis',
        textAlign: 'center',
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

  const companyColors = {};
  companies.forEach((c, i) => { companyColors[c.id] = ACCENT[i % ACCENT.length]; });

  const companyShort = {};
  companies.forEach(c => {
    companyShort[c.id] = c.name.slice(0, 2).toUpperCase();
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(100,116,139,.35)' }} />
          Exact match (100%)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(100,116,139,.2)', border: '2px dashed rgba(100,116,139,.5)', boxSizing: 'border-box' }} />
          Partial span — badge = %
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", background: 'rgba(100,116,139,.15)', padding: '1px 5px', borderRadius: 3 }}>60%</div>
          Dot size reflects overlap %
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
        <thead>
          <tr>
            <th style={{
              padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
              color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace",
              textTransform: 'uppercase', letterSpacing: '0.08em',
              borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
              whiteSpace: 'nowrap', minWidth: 160,
            }}>
              Level
            </th>
            {companies.map((c, i) => (
              <th key={c.id} style={{
                padding: '10px 16px', textAlign: 'center',
                borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
                minWidth: 120,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={26} radius={6} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT[i % ACCENT.length] }}>{c.name}</span>
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
                {/* Standard level label */}
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
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
                      position: 'relative',
                    }}>
                      {cells.length === 0 ? (
                        <span style={{ color: 'var(--border)', fontSize: 18 }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'flex-end' }}>
                          {cells.map((cell, ci2) => (
                            <div key={ci2} style={{ position: 'relative' }}>
                              <OverlapDot
                                color={color}
                                short={short}
                                title={cell.title}
                                overlapPct={cell.overlapPct ?? 100}
                                onHover={e => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const detail = cell.overlapPct < 100
                                    ? `${cell.overlapPct}% of ${cell.title} sits at ${sl.name}`
                                    : `${cell.title} maps exactly to ${sl.name}`;
                                  setTooltip({ x: rect.left, y: rect.top, text: `${c.name} · ${cell.title}`, detail });
                                }}
                                onLeave={() => setTooltip(null)}
                              />
                            </div>
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

      {/* Floating tooltip */}
      {tooltip && (
        <Tooltip
          text={tooltip.text}
          detail={tooltip.detail}
          style={{ position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 8 }}
        />
      )}
    </div>
  );
}

/* ─── Company Selector ────────────────────────────────────────────────────── */
function CompanySelector({ selected, onChange }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function h(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSug(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function handleInput(e) {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    if (v.length < 2) { setSuggestions([]); setShowSug(false); return; }
    debounceRef.current = setTimeout(() => {
      api.get('/public/companies', { params: { name: v, size: 8, page: 0 } })
        .then(r => {
          const results = (r.data?.data?.content ?? []).filter(c => !selected.find(s => s.id === c.id));
          setSuggestions(results); setShowSug(true);
        }).catch(console.error);
    }, 300);
  }

  function add(company) {
    if (selected.length >= MAX_COMPANIES) return;
    onChange([...selected, company]);
    setQuery(''); setSuggestions([]); setShowSug(false);
  }

  function remove(id) { onChange(selected.filter(c => c.id !== id)); }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: selected.length ? 12 : 0 }}>
        {selected.map((c, i) => (
          <div key={c.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 12px 5px 8px', borderRadius: 99,
            background: `${ACCENT[i % ACCENT.length]}14`,
            border: `1px solid ${ACCENT[i % ACCENT.length]}40`,
          }}>
            <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={20} radius={4} />
            <span style={{ fontSize: 13, fontWeight: 500, color: ACCENT[i % ACCENT.length] }}>{c.name}</span>
            <span onClick={() => remove(c.id)} style={{ cursor: 'pointer', opacity: 0.6, fontSize: 14, lineHeight: 1, color: ACCENT[i % ACCENT.length] }}>×</span>
          </div>
        ))}
      </div>
      {selected.length < MAX_COMPANIES && (
        <div ref={wrapRef} style={{ position: 'relative', maxWidth: 340 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--text-3)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={query} onChange={handleInput}
              onFocus={() => suggestions.length > 0 && setShowSug(true)}
              placeholder={`Add company (${MAX_COMPANIES - selected.length} remaining)…`}
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text-1)', outline: 'none' }}
              autoComplete="off"
            />
          </div>
          {showSug && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
              {suggestions.map((c, i) => (
                <div key={c.id} onClick={() => add(c)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={26} radius={6} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
                    {c.industry && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.industry}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Hex helper ──────────────────────────────────────────────────────────── */
function hexRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
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
        console.error('Grid fetch failed:', status, msg);
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
            Add up to {MAX_COMPANIES} companies. Dot size and % badge show how much a role overlaps each standard level.
          </div>
        </div>
        <CompanySelector selected={selected} onChange={setSelected} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginRight: 4 }}>Function:</span>
          {FUNCTIONS.map(fn => (
            <button key={fn} onClick={() => { TopProgressBar.start(); setFunctionCategory(fn); }}
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
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Search and add companies above</div>
          <div style={{ fontSize: 13 }}>Their level equivalencies will appear here side by side.</div>
        </div>
      )}

      {/* Loading */}
      {selected.length > 0 && loading && (
        <div style={{ padding: '32px 0 30px' }}>
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

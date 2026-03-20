import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

const MAX_COMPANIES = 5;
const ACCENT = ['#3b82f6','#8b5cf6','#06b6d4','#6366f1','#a78bfa'];

/* ─── Company autocomplete chip selector ─────────────────────────────────── */
function CompanySelector({ selected, onChange }) {
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

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
          const results = (r.data?.data?.content ?? [])
            .filter(c => !selected.find(s => s.id === c.id));
          setSuggestions(results);
          setShowSug(true);
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
      {/* Selected chips */}
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

      {/* Search input */}
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

/* ─── Comparison grid ────────────────────────────────────────────────────── */
function ComparisonGrid({ grid, standardLevels, companies }) {
  if (!standardLevels.length || !companies.length) return null;

  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
        <thead>
          <tr>
            {/* Standard level header column */}
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
                minWidth: 140,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={28} radius={6} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT[i % ACCENT.length] }}>{c.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standardLevels.map((sl, rowIdx) => {
            const rowCells = grid[sl.id] ?? {};
            const hasAny = companies.some(c => rowCells[c.id]);
            if (!hasAny) return null; // skip rows with no data across selected companies

            return (
              <tr key={sl.id} style={{ background: rowIdx % 2 === 0 ? 'transparent' : 'var(--bg-2)' }}>
                {/* Standard level cell */}
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
                  const title = rowCells[c.id];
                  return (
                    <td key={c.id} style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                      {title ? (
                        <span style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: 99,
                          background: `${ACCENT[ci % ACCENT.length]}12`,
                          border: `1px solid ${ACCENT[ci % ACCENT.length]}35`,
                          fontSize: 12, fontWeight: 600,
                          color: ACCENT[ci % ACCENT.length],
                          fontFamily: "'JetBrains Mono',monospace",
                        }}>
                          {title}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-4,var(--text-3))', fontSize: 20 }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Main Level Guide View ──────────────────────────────────────────────── */
export default function LevelGuideView() {
  const [selected,       setSelected]       = useState([]);
  const [gridData,       setGridData]       = useState(null);
  const [allStdLevels,   setAllStdLevels]   = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const debounceRef = useRef(null);

  // Fetch standard levels once for header labels
  useEffect(() => {
    api.get('/public/guide-levels/standard')
      .then(r => setAllStdLevels(r.data?.data ?? []))
      .catch(console.error);
  }, []);

  // Fetch grid whenever selection changes — debounced 400ms
  const fetchGrid = useCallback((companies) => {
    if (companies.length === 0) { setGridData(null); return; }
    setLoading(true); setError(null);
    const ids = companies.map(c => c.id);
    api.get('/public/guide-levels/grid', { params: { companyIds: ids } })
      .then(r => setGridData(r.data?.data ?? null))
      .catch(() => setError('Failed to load level data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGrid(selected), 400);
    return () => clearTimeout(debounceRef.current);
  }, [selected, fetchGrid]);

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
            Add up to {MAX_COMPANIES} companies to see how their internal titles map to each other. For example, how Flipkart's "MTS" compares to Google's "L5".
          </div>
        </div>
        <CompanySelector selected={selected} onChange={setSelected} />
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
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
          Loading level data…
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
                Level mappings for {selected.map(c => c.name).join(', ')} haven't been added yet.<br/>
                Data is contributed progressively — check back soon.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

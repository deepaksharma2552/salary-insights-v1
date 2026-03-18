import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import api from '../../services/api';

// ── Shared stacked bar row ────────────────────────────────────────────────────
function StackedBarRow({ label, row, maxVal, labelWidth = 90 }) {
  const base   = row.avgBaseSalary ?? 0;
  const bonus  = row.avgBonus      ?? 0;
  const equity = row.avgEquity     ?? 0;
  const total  = base + bonus + equity;
  const trackPct  = maxVal > 0 ? (total / maxVal) * 100 : 0;
  const bonusPct  = total > 0 ? (bonus  / total) * trackPct : 0;
  const equityPct = total > 0 ? (equity / total) * trackPct : 0;
  const basePct   = trackPct - bonusPct - equityPct;
  const fmt = (v) => { if (!v && v !== 0) return '—'; const l = v / 100000; return l >= 100 ? `₹${(l/100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`; };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}
      onMouseEnter={e => { const t = e.currentTarget.querySelector('.sb-tip'); if (t) t.style.display = 'block'; }}
      onMouseLeave={e => { const t = e.currentTarget.querySelector('.sb-tip'); if (t) t.style.display = 'none'; }}
    >
      <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500, width: labelWidth, minWidth: labelWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 100, background: 'var(--bg-3)', overflow: 'hidden', display: 'flex' }}>
        {basePct   > 0 && <div style={{ width: `${basePct}%`,   height: '100%', background: '#2563eb', flexShrink: 0 }} />}
        {bonusPct  > 0 && <div style={{ width: `${bonusPct}%`,  height: '100%', background: '#10b981', flexShrink: 0 }} />}
        {equityPct > 0 && <div style={{ width: `${equityPct}%`, height: '100%', background: '#f59e0b', flexShrink: 0 }} />}
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, color: 'var(--text-1)', width: 52, minWidth: 52, textAlign: 'right' }}>
        {fmt(total)}
      </span>
      <div className="sb-tip" style={{ display: 'none', position: 'absolute', left: labelWidth + 8, bottom: 'calc(100% + 6px)', zIndex: 200, pointerEvents: 'none', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', boxShadow: '0 4px 16px rgba(0,0,0,0.14)', minWidth: 170, whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>{label}</div>
        {[['Base salary', base, '#2563eb'], ['Bonus', bonus, '#10b981'], ['Equity', equity, '#f59e0b']].map(([l, v, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{l}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>{v > 0 ? fmt(v) : '—'}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 5, paddingTop: 5, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>Total</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Reusable multiselect dropdown ─────────────────────────────────────────────
function FilterDropdown({ refEl, open, setOpen, search, setSearch, options, selected, onToggle, onClear, placeholder, max = 99 }) {
  return (
    <div ref={refEl} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => { setOpen(o => !o); setSearch(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: selected.length ? 'var(--blue)' : 'var(--panel)', color: selected.length ? '#fff' : 'var(--text-2)', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
        {selected.length > 0 ? `${selected.length} selected` : 'Filter by location'} <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 100, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: 210, padding: 8 }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder} style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', marginBottom: 6, outline: 'none' }} />
          {selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {selected.map(v => (
                <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 100, fontSize: 11, background: 'var(--blue)', color: '#fff', fontWeight: 500 }}>
                  {v} <span onClick={() => onToggle(v)} style={{ cursor: 'pointer', opacity: 0.8, fontSize: 10 }}>✕</span>
                </span>
              ))}
            </div>
          )}
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {options.length === 0
              ? <div style={{ padding: '8px 4px', fontSize: 12, color: 'var(--text-3)' }}>No results</div>
              : options.map(v => {
                  const isSel = selected.includes(v);
                  const isDis = !isSel && selected.length >= max;
                  return (
                    <div key={v} onClick={() => !isDis && onToggle(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, fontSize: 12, cursor: isDis ? 'not-allowed' : 'pointer', opacity: isDis ? 0.4 : 1, background: isSel ? 'color-mix(in srgb, var(--blue) 10%, transparent)' : 'transparent', color: 'var(--text-1)' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: `1.5px solid ${isSel ? 'var(--blue)' : 'var(--border)'}`, background: isSel ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isSel && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                      </span>
                      {v}
                    </div>
                  );
                })
            }
          </div>
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{selected.length} selected</span>
            {selected.length > 0 && <span onClick={onClear} style={{ fontSize: 11, color: 'var(--blue)', cursor: 'pointer', fontWeight: 500 }}>Clear all</span>}
          </div>
        </div>
      )}
    </div>
  );
}

const LEGEND    = [{ label: 'Base', color: '#2563eb' }, { label: 'Bonus', color: '#10b981' }, { label: 'Equity', color: '#f59e0b' }];
const BAR_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#16a34a', '#ea580c', '#e11d48', '#d97706', '#0284c7'];

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [byLocation,      setByLocation]      = useState([]);
  const [byCompanyLevel,  setByCompanyLevel]  = useState([]);
  const [byInternalLevel, setByInternalLevel] = useState([]);
  const [lvlLoading,      setLvlLoading]      = useState(false);
  const [loading,         setLoading]         = useState(true);

  // Location filter for the internal-level chart
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [locFilterOpen,     setLocFilterOpen]     = useState(false);
  const [locSearch,         setLocSearch]         = useState('');
  const locRef = useRef(null);

  // Company chart filter
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [coFilterOpen,      setCoFilterOpen]      = useState(false);
  const [coSearch,          setCoSearch]          = useState('');
  const coRef = useRef(null);

  const fmt = (v) => { if (!v && v !== 0) return '—'; const l = v / 100000; return l >= 100 ? `₹${(l/100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`; };

  // Initial load
  useEffect(() => {
    Promise.all([
      api.get('/public/salaries/analytics/by-location'),
      api.get('/public/salaries/analytics/by-company-level'),
      api.get('/public/salaries/analytics/by-internal-level'),
    ]).then(([loc, cl, il]) => {
      setByLocation(loc.data?.data     ?? []);
      setByCompanyLevel(cl.data?.data  ?? []);
      setByInternalLevel(il.data?.data ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Re-fetch internal level whenever location filter changes
  const fetchInternalLevel = useCallback((locations) => {
    setLvlLoading(true);
    const params = locations.length > 0
      ? '?' + locations.map(l => `locations=${encodeURIComponent(l)}`).join('&')
      : '';
    api.get(`/public/salaries/analytics/by-internal-level${params}`)
      .then(res => setByInternalLevel(res.data?.data ?? []))
      .catch(console.error)
      .finally(() => setLvlLoading(false));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (locRef.current && !locRef.current.contains(e.target)) { setLocFilterOpen(false); setLocSearch(''); }
      if (coRef.current  && !coRef.current.contains(e.target))  { setCoFilterOpen(false);  setCoSearch('');  }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // All available location names from the location data
  const allLocations    = useMemo(() => byLocation.map(r => r.groupKey).filter(Boolean), [byLocation]);
  const filteredLocOpts = useMemo(() => allLocations.filter(l => l.toLowerCase().includes(locSearch.toLowerCase())), [allLocations, locSearch]);

  const toggleLocation = (loc) => {
    const next = selectedLocations.includes(loc)
      ? selectedLocations.filter(l => l !== loc)
      : [...selectedLocations, loc];
    setSelectedLocations(next);
    fetchInternalLevel(next);
  };

  const clearLocations = () => {
    setSelectedLocations([]);
    setLocFilterOpen(false);
    fetchInternalLevel([]);
  };

  // Internal level chart max
  const maxLevel = useMemo(() =>
    byInternalLevel.length ? Math.max(...byInternalLevel.map(r => (r.avgBaseSalary ?? 0) + (r.avgBonus ?? 0) + (r.avgEquity ?? 0)), 1) : 1,
    [byInternalLevel]
  );

  // Company chart derived state
  const groupedByCompany = useMemo(() => {
    const map = new Map();
    for (const row of byCompanyLevel) {
      if (!map.has(row.companyName)) map.set(row.companyName, []);
      map.get(row.companyName).push(row);
    }
    return map;
  }, [byCompanyLevel]);
  const allCompanies     = useMemo(() => Array.from(groupedByCompany.keys()), [groupedByCompany]);
  const filteredCoOpts   = useMemo(() => allCompanies.filter(c => c.toLowerCase().includes(coSearch.toLowerCase())), [allCompanies, coSearch]);
  const displayedCompanies = useMemo(() =>
    selectedCompanies.length > 0 ? selectedCompanies.filter(c => groupedByCompany.has(c)) : allCompanies.slice(0, 5),
    [selectedCompanies, allCompanies, groupedByCompany]
  );
  const maxCompLevel = useMemo(() => {
    if (!displayedCompanies.length) return 1;
    return Math.max(...displayedCompanies.flatMap(c => (groupedByCompany.get(c) ?? []).map(r => (r.avgBaseSalary ?? 0) + (r.avgBonus ?? 0) + (r.avgEquity ?? 0))), 1);
  }, [displayedCompanies, groupedByCompany]);

  const toggleCompany = (c) => setSelectedCompanies(prev => prev.includes(c) ? prev.filter(x => x !== c) : prev.length >= 5 ? prev : [...prev, c]);

  const EmptyState = () => <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>No data available yet.</div>;
  const Legend     = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
      {LEGEND.map(({ label, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <section className="section">
      <div className="section-header">
        <span className="section-tag">Analytics</span>
        <h2 className="section-title">360° Compensation <em>Intelligence</em></h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>Aggregated salary data across all approved submissions</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>Loading analytics…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12, alignItems: 'start' }}>

          {/* ── Chart 1: Internal Level (filtered by location) ── */}
          <div className="chart-card">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <div>
                <div className="chart-title">Avg Salary by Location &amp; Job Level</div>
                <div className="chart-subtitle">Across all companies · filter by location</div>
              </div>
              <FilterDropdown
                refEl={locRef} open={locFilterOpen} setOpen={setLocFilterOpen}
                search={locSearch} setSearch={setLocSearch}
                options={filteredLocOpts} selected={selectedLocations}
                onToggle={toggleLocation} onClear={clearLocations}
                placeholder="Search location…"
              />
            </div>

            {/* Active location chips */}
            {selectedLocations.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {selectedLocations.map(loc => (
                  <span key={loc} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 100, fontSize: 11, background: 'color-mix(in srgb, var(--blue) 12%, transparent)', color: 'var(--blue)', border: '1px solid color-mix(in srgb, var(--blue) 30%, transparent)', fontWeight: 500 }}>
                    {loc}
                    <span onClick={() => toggleLocation(loc)} style={{ cursor: 'pointer', fontSize: 10, opacity: 0.7 }}>✕</span>
                  </span>
                ))}
              </div>
            )}

            <Legend />

            {lvlLoading ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 12 }}>Updating…</div>
            ) : byInternalLevel.length === 0 ? <EmptyState /> : (
              <div className="level-bars">
                {byInternalLevel.map(row => (
                  <StackedBarRow key={row.groupKey} label={row.groupKey} row={row} maxVal={maxLevel} labelWidth={130} />
                ))}
              </div>
            )}
          </div>

          {/* ── Chart 2: Company & Level ── */}
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <div>
                <div className="chart-title">Avg Salary by Company &amp; Job Level</div>
                <div className="chart-subtitle">{selectedCompanies.length > 0 ? `Showing ${selectedCompanies.length} of 10 · up to 5 selectable` : 'Top 5 by latest data · up to 10 available'}</div>
              </div>
              <div ref={coRef} style={{ position: 'relative', flexShrink: 0 }}>
                <button onClick={() => { setCoFilterOpen(o => !o); setCoSearch(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: selectedCompanies.length ? 'var(--blue)' : 'var(--panel)', color: selectedCompanies.length ? '#fff' : 'var(--text-2)', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {selectedCompanies.length > 0 ? `${selectedCompanies.length} selected` : 'Filter'} <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
                </button>
                {coFilterOpen && (
                  <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 100, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: 210, padding: 8 }}>
                    <input autoFocus value={coSearch} onChange={e => setCoSearch(e.target.value)} placeholder="Search company…" style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 6, fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', marginBottom: 6, outline: 'none' }} />
                    {selectedCompanies.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                        {selectedCompanies.map(v => <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 100, fontSize: 11, background: 'var(--blue)', color: '#fff', fontWeight: 500 }}>{v} <span onClick={() => toggleCompany(v)} style={{ cursor: 'pointer', opacity: 0.8, fontSize: 10 }}>✕</span></span>)}
                      </div>
                    )}
                    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                      {filteredCoOpts.map(v => {
                        const isSel = selectedCompanies.includes(v);
                        const isDis = !isSel && selectedCompanies.length >= 5;
                        return (
                          <div key={v} onClick={() => !isDis && toggleCompany(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, fontSize: 12, cursor: isDis ? 'not-allowed' : 'pointer', opacity: isDis ? 0.4 : 1, background: isSel ? 'color-mix(in srgb, var(--blue) 10%, transparent)' : 'transparent', color: 'var(--text-1)' }}>
                            <span style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: `1.5px solid ${isSel ? 'var(--blue)' : 'var(--border)'}`, background: isSel ? 'var(--blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isSel && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                            </span>
                            {v}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{selectedCompanies.length}/5 selected</span>
                      {selectedCompanies.length > 0 && <span onClick={() => { setSelectedCompanies([]); setCoFilterOpen(false); }} style={{ fontSize: 11, color: 'var(--blue)', cursor: 'pointer', fontWeight: 500 }}>Clear all</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Legend />

            {byCompanyLevel.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {displayedCompanies.map((company, ci) => (
                  <div key={company}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, background: `${BAR_COLORS[ci % BAR_COLORS.length]}22`, border: `1px solid ${BAR_COLORS[ci % BAR_COLORS.length]}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: BAR_COLORS[ci % BAR_COLORS.length], fontFamily: "'IBM Plex Mono',monospace" }}>
                        {company.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }} title={company}>{company}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(groupedByCompany.get(company) ?? []).map(row => {
                        const base = row.avgBaseSalary ?? 0, bonus = row.avgBonus ?? 0, equity = row.avgEquity ?? 0;
                        const total = base + bonus + equity;
                        const trackPct  = maxCompLevel > 0 ? (total / maxCompLevel) * 100 : 0;
                        const bonusPct  = total > 0 ? (bonus  / total) * trackPct : 0;
                        const equityPct = total > 0 ? (equity / total) * trackPct : 0;
                        const basePct   = trackPct - bonusPct - equityPct;
                        return (
                          <div key={row.internalLevel} style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}
                            onMouseEnter={e => { const t = e.currentTarget.querySelector('.co-tip'); if (t) t.style.display = 'block'; }}
                            onMouseLeave={e => { const t = e.currentTarget.querySelector('.co-tip'); if (t) t.style.display = 'none'; }}
                          >
                            <span style={{ fontSize: 11, color: 'var(--text-3)', width: 120, minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono',monospace" }} title={row.internalLevel}>{row.internalLevel}</span>
                            <div style={{ flex: 1, height: 8, borderRadius: 100, background: 'var(--bg-3)', overflow: 'hidden', display: 'flex' }}>
                              {basePct   > 0 && <div style={{ width: `${basePct}%`,   height: '100%', background: '#2563eb', flexShrink: 0 }} />}
                              {bonusPct  > 0 && <div style={{ width: `${bonusPct}%`,  height: '100%', background: '#10b981', flexShrink: 0 }} />}
                              {equityPct > 0 && <div style={{ width: `${equityPct}%`, height: '100%', background: '#f59e0b', flexShrink: 0 }} />}
                            </div>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, color: 'var(--text-1)', width: 52, minWidth: 52, textAlign: 'right' }}>{fmt(total)}</span>
                            <div className="co-tip" style={{ display: 'none', position: 'absolute', left: 128, bottom: 'calc(100% + 6px)', zIndex: 200, pointerEvents: 'none', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', boxShadow: '0 4px 16px rgba(0,0,0,0.14)', minWidth: 170, whiteSpace: 'nowrap' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>{row.internalLevel}</div>
                              {[['Base salary', base, '#2563eb'], ['Bonus', bonus, '#10b981'], ['Equity', equity, '#f59e0b']].map(([l, v, c]) => (
                                <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
                                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{l}</span>
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>{v > 0 ? fmt(v) : '—'}</span>
                                </div>
                              ))}
                              <div style={{ borderTop: '1px solid var(--border)', marginTop: 5, paddingTop: 5, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>Total</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>{fmt(total)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </section>
  );
}

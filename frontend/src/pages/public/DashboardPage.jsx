import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../services/api';

export default function DashboardPage() {
  const [byLocation,     setByLocation]     = useState([]);
  const [byCompanyLevel, setByCompanyLevel] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [search,         setSearch]         = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/public/salaries/analytics/by-location'),
      api.get('/public/salaries/analytics/by-company-level'),
    ]).then(([loc, cl]) => {
      setByLocation(loc.data?.data   ?? []);
      setByCompanyLevel(cl.data?.data ?? []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setFilterOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fmt = (val) => {
    if (!val && val !== 0) return '—';
    const l = val / 100000;
    return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
  };

  const BAR_COLORS = [
    '#2563eb', '#0891b2', '#7c3aed', '#16a34a',
    '#ea580c', '#e11d48', '#d97706', '#0284c7',
  ];

  const LEVEL_COLORS = {
    'SDE 1': '#0ea5e9', 'SDE 2': '#6366f1', 'SDE 3': '#8b5cf6',
    'Staff Engineer': '#10b981', 'Principal Engineer': '#059669',
    'Architect': '#f59e0b', 'Engineering Manager': '#f97316',
    'Sr. Engineering Manager': '#ef4444', 'Director': '#dc2626',
    'Sr. Director': '#b91c1c', 'VP': '#7f1d1d',
  };

  const maxLoc = byLocation.length
    ? Math.max(...byLocation.map(r => r.avgBaseSalary ?? 0), 1)
    : 1;

  // Map preserves backend insertion order (recency sort) — plain {} does not guarantee it
  const groupedByCompany = useMemo(() => {
    const map = new Map();
    for (const row of byCompanyLevel) {
      if (!map.has(row.companyName)) map.set(row.companyName, []);
      map.get(row.companyName).push(row);
    }
    return map;
  }, [byCompanyLevel]);

  // All company names in recency order (Map preserves insertion order)
  const allCompanies = useMemo(() => Array.from(groupedByCompany.keys()), [groupedByCompany]);

  // Companies visible in the chart
  const displayedCompanies = useMemo(() =>
    selectedCompanies.length > 0
      ? selectedCompanies.filter(c => groupedByCompany.has(c))
      : allCompanies.slice(0, 5),
    [selectedCompanies, allCompanies, groupedByCompany]
  );

  // Max total comp across displayed companies — used to scale stacked bars
  const maxCompLevel = useMemo(() => {
    if (!displayedCompanies.length) return 1;
    return Math.max(
      ...displayedCompanies.flatMap(c =>
        (groupedByCompany.get(c) ?? []).map(r =>
          (r.avgBaseSalary ?? 0) + (r.avgBonus ?? 0) + (r.avgEquity ?? 0)
        )
      ),
      1
    );
  }, [displayedCompanies, groupedByCompany]);

  // Dropdown options filtered by search — only recomputes when search or allCompanies changes
  const filteredOptions = useMemo(() =>
    allCompanies.filter(c => c.toLowerCase().includes(search.toLowerCase())),
    [allCompanies, search]
  );

  const toggleCompany = (company) => {
    setSelectedCompanies(prev => {
      if (prev.includes(company)) return prev.filter(c => c !== company);
      if (prev.length >= 5) return prev; // max 5
      return [...prev, company];
    });
  };

  const clearFilter = () => {
    setSelectedCompanies([]);
    setSearch('');
    setFilterOpen(false);
  };

  const EmptyState = () => (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>
      No data available yet.
    </div>
  );

  return (
    <section className="section">

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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 12,
          marginBottom: 12,
        }}>

          {/* Chart 1 — Avg Salary by Location */}
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-title">Avg Base Salary by Location</div>
              <div className="chart-subtitle">Top metro areas · sorted by salary</div>
            </div>
            {byLocation.length === 0 ? <EmptyState /> : (
              <div className="level-bars">
                {byLocation.slice(0, 8).map((row, i) => {
                  const pct = Math.round((row.avgBaseSalary / maxLoc) * 100);
                  return (
                    <div key={row.groupKey} className="level-bar-row">
                      <span className="level-bar-label" style={{ minWidth: 90 }}>{row.groupKey}</span>
                      <div className="level-bar-track">
                        <div className="level-bar-fill" style={{ width: `${pct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                      </div>
                      <span className="level-bar-val">{fmt(row.avgBaseSalary)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart 2 — Avg Base Salary by Company & Level */}
          <div className="chart-card">
            {/* Header + filter */}
            <div className="chart-card-header" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div className="chart-title">Avg Base Salary by Company &amp; Level</div>
                  <div className="chart-subtitle">
                    {selectedCompanies.length > 0
                      ? `Showing ${selectedCompanies.length} of 10 · up to 5 selectable`
                      : 'Top 5 by latest data · up to 10 available'}
                  </div>
                </div>

                {/* Multi-select dropdown */}
                <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={() => { setFilterOpen(o => !o); setSearch(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px', borderRadius: 6, fontSize: 12,
                      border: '1px solid var(--border)',
                      background: selectedCompanies.length ? 'var(--blue)' : 'var(--panel)',
                      color: selectedCompanies.length ? '#fff' : 'var(--text-2)',
                      cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
                    }}
                  >
                    {selectedCompanies.length > 0 ? `${selectedCompanies.length} selected` : 'Filter'}
                    <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
                  </button>

                  {filterOpen && (
                    <div style={{
                      position: 'absolute', right: 0, top: '110%', zIndex: 100,
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                      width: 220, padding: 8,
                    }}>
                      {/* Search */}
                      <input
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search company…"
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '6px 8px', borderRadius: 6, fontSize: 12,
                          border: '1px solid var(--border)', background: 'var(--bg-2)',
                          color: 'var(--text-1)', marginBottom: 6, outline: 'none',
                        }}
                      />

                      {/* Selected chips */}
                      {selectedCompanies.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                          {selectedCompanies.map(c => (
                            <span key={c} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 7px', borderRadius: 100, fontSize: 11,
                              background: 'var(--blue)', color: '#fff', fontWeight: 500,
                            }}>
                              {c}
                              <span
                                onClick={() => toggleCompany(c)}
                                style={{ cursor: 'pointer', opacity: 0.8, fontSize: 10, lineHeight: 1 }}
                              >✕</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Options */}
                      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        {filteredOptions.length === 0 ? (
                          <div style={{ padding: '8px 4px', fontSize: 12, color: 'var(--text-3)' }}>No results</div>
                        ) : filteredOptions.map(c => {
                          const isSelected = selectedCompanies.includes(c);
                          const isDisabled = !isSelected && selectedCompanies.length >= 5;
                          return (
                            <div
                              key={c}
                              onClick={() => !isDisabled && toggleCompany(c)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '6px 8px', borderRadius: 6, fontSize: 12,
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                opacity: isDisabled ? 0.4 : 1,
                                background: isSelected ? 'color-mix(in srgb, var(--blue) 10%, transparent)' : 'transparent',
                                color: 'var(--text-1)',
                              }}
                            >
                              <span style={{
                                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                                border: `1.5px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                                background: isSelected ? 'var(--blue)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {isSelected && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                              </span>
                              {c}
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {selectedCompanies.length}/5 selected
                        </span>
                        {selectedCompanies.length > 0 && (
                          <span onClick={clearFilter} style={{ fontSize: 11, color: 'var(--blue)', cursor: 'pointer', fontWeight: 500 }}>
                            Clear all
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chart body */}
            {byCompanyLevel.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Base', color: '#2563eb' },
                    { label: 'Bonus', color: '#10b981' },
                    { label: 'Equity', color: '#f59e0b' },
                  ].map(({ label, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</span>
                    </div>
                  ))}
                </div>

                {displayedCompanies.map((company, ci) => (
                  <div key={company}>
                    {/* Company header — avatar + truncated name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                        background: `${BAR_COLORS[ci % BAR_COLORS.length]}22`,
                        border: `1px solid ${BAR_COLORS[ci % BAR_COLORS.length]}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700, color: BAR_COLORS[ci % BAR_COLORS.length],
                        fontFamily: "'IBM Plex Mono',monospace",
                      }}>
                        {company.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: 'var(--text-1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }} title={company}>
                        {company}
                      </span>
                    </div>

                    {/* Level rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(groupedByCompany.get(company) ?? []).map(row => {
                        const base   = row.avgBaseSalary ?? 0;
                        const bonus  = row.avgBonus      ?? 0;
                        const equity = row.avgEquity     ?? 0;
                        const total  = base + bonus + equity;
                        const basePct   = Math.round((base   / maxCompLevel) * 100);
                        const bonusPct  = Math.round((bonus  / maxCompLevel) * 100);
                        const equityPct = Math.round((equity / maxCompLevel) * 100);

                        return (
                          <div key={row.internalLevel} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Fixed-width level label — truncates if too long */}
                            <span style={{
                              fontSize: 11, color: 'var(--text-3)',
                              width: 120, minWidth: 120,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              fontFamily: "'IBM Plex Mono',monospace",
                            }} title={row.internalLevel}>
                              {row.internalLevel}
                            </span>

                            {/* Stacked bar */}
                            <div style={{
                              flex: 1, height: 8, borderRadius: 100,
                              background: 'var(--bg-3)', overflow: 'hidden',
                              display: 'flex',
                            }}>
                              {basePct > 0 && (
                                <div style={{ width: `${basePct}%`, height: '100%', background: '#2563eb', flexShrink: 0 }} />
                              )}
                              {bonusPct > 0 && (
                                <div style={{ width: `${bonusPct}%`, height: '100%', background: '#10b981', flexShrink: 0 }} />
                              )}
                              {equityPct > 0 && (
                                <div style={{ width: `${equityPct}%`, height: '100%', background: '#f59e0b', flexShrink: 0 }} />
                              )}
                            </div>

                            {/* Total comp value — fixed width so values align */}
                            <span style={{
                              fontFamily: "'IBM Plex Mono',monospace",
                              fontSize: 11, fontWeight: 600, color: 'var(--text-1)',
                              width: 52, minWidth: 52, textAlign: 'right',
                            }}>
                              {fmt(total)}
                            </span>
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

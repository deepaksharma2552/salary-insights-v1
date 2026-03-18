import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

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

/* ─── Company multiselect (max 5) ────────────────────────────────────────── */
function CompanyFilter({ allCompanies, selected, onChange }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef             = useRef(null);

  useEffect(() => {
    function handle(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filtered = allCompanies.filter(c =>
    c.toLowerCase().includes(search.toLowerCase()) && !selected.includes(c)
  );

  function toggle(company) {
    if (selected.includes(company)) {
      onChange(selected.filter(c => c !== company));
    } else if (selected.length < 5) {
      onChange([...selected, company]);
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 8,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          cursor: 'pointer', fontSize: 11, color: 'var(--text-2)',
          fontFamily: "'IBM Plex Mono',monospace",
        }}
      >
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="9" y2="18"/>
        </svg>
        Filter companies
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
          borderRadius: 10, padding: 8, minWidth: 220, zIndex: 50,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company…"
            style={{
              width: '100%', padding: '6px 8px', borderRadius: 6,
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-1)', outline: 'none',
              fontFamily: "'IBM Plex Mono',monospace", boxSizing: 'border-box',
            }}
          />
          {selected.length >= 5 && (
            <div style={{ fontSize: 10, color: '#d97706', padding: '4px 4px 0', fontFamily: "'IBM Plex Mono',monospace" }}>
              Max 5 companies selected
            </div>
          )}
          <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 6 }}>
            {filtered.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '6px 4px' }}>No matches</div>
            )}
            {filtered.map(company => (
              <div
                key={company}
                onClick={() => toggle(company)}
                style={{
                  padding: '6px 8px', borderRadius: 6,
                  cursor: selected.length >= 5 ? 'not-allowed' : 'pointer',
                  fontSize: 12, color: selected.length >= 5 ? 'var(--text-4)' : 'var(--text-2)',
                  opacity: selected.length >= 5 ? 0.5 : 1,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (selected.length < 5) e.currentTarget.style.background = 'var(--bg-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {company}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [byLocation,        setByLocation]        = useState([]);
  const [byCompany,         setByCompany]         = useState([]);
  const [byCompanyLevel,    setByCompanyLevel]    = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/public/salaries/analytics/by-location'),
      api.get('/public/salaries/analytics/by-company'),
      api.get('/public/salaries/analytics/by-company-level'),
    ]).then(([loc, co, cl]) => {
      setByLocation(loc.data?.data ?? []);
      setByCompany(co.data?.data   ?? []);
      setByCompanyLevel(cl.data?.data ?? []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (val) => {
    if (!val && val !== 0) return '—';
    const l = val / 100000;
    return l >= 100 ? `₹${(l/100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
  };

  const BAR_COLORS = ['#2563eb','#0891b2','#7c3aed','#16a34a','#ea580c','#e11d48','#d97706','#0284c7'];

  const LEVEL_COLORS = {
    'SDE 1': '#0ea5e9', 'SDE 2': '#6366f1', 'SDE 3': '#8b5cf6',
    'Staff Engineer': '#10b981', 'Principal Engineer': '#059669',
    'Architect': '#f59e0b', 'Engineering Manager': '#f97316',
    'Sr. Engineering Manager': '#ef4444', 'Director': '#dc2626',
    'Sr. Director': '#b91c1c', 'VP': '#7f1d1d',
  };

  const maxLoc = byLocation.length ? Math.max(...byLocation.map(r => r.avgBaseSalary ?? 0), 1) : 1;
  const maxCo  = byCompany.length  ? Math.max(...byCompany.slice(0,10).map(r => r.avgBaseSalary ?? 0), 1) : 1;

  const grouped = byCompanyLevel.reduce((acc, row) => {
    if (!acc[row.companyName]) acc[row.companyName] = [];
    acc[row.companyName].push(row);
    return acc;
  }, {});
  const allCompanyNames = Object.keys(grouped);

  const visibleCompanies = selectedCompanies.length > 0
    ? selectedCompanies.filter(c => grouped[c])
    : allCompanyNames.slice(0, 6);

  const maxLevelVal = byCompanyLevel.length
    ? Math.max(...byCompanyLevel.map(r => r.avgBaseSalary ?? 0), 1) : 1;

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
        <>
          {/* ── CHART GRID ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>

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
              {/* Header row with filter */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
                <div>
                  <div className="chart-title">Avg Base Salary by Company &amp; Level</div>
                  <div className="chart-subtitle">Breakdown by internal level per company</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                  <CompanyFilter
                    allCompanies={allCompanyNames}
                    selected={selectedCompanies}
                    onChange={setSelectedCompanies}
                  />
                  {selectedCompanies.length > 0 && (
                    <button
                      onClick={() => setSelectedCompanies([])}
                      style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'IBM Plex Mono',monospace" }}
                    >
                      ✕ clear filter
                    </button>
                  )}
                </div>
              </div>

              {/* Selected chips */}
              {selectedCompanies.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {selectedCompanies.map((c, ci) => (
                    <div key={c} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 100,
                      background: `${BAR_COLORS[ci % BAR_COLORS.length]}18`,
                      border: `1px solid ${BAR_COLORS[ci % BAR_COLORS.length]}44`,
                      fontSize: 11, color: BAR_COLORS[ci % BAR_COLORS.length], fontWeight: 500,
                    }}>
                      {c}
                      <span onClick={() => setSelectedCompanies(selectedCompanies.filter(x => x !== c))} style={{ cursor: 'pointer', opacity: 0.7 }}>×</span>
                    </div>
                  ))}
                </div>
              )}

              {byCompanyLevel.length === 0 ? <EmptyState /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {visibleCompanies.map((company, ci) => {
                    const rows     = grouped[company] ?? [];
                    const firstRow = rows[0];
                    return (
                      <div key={company}>
                        {/* Company header: logo + name + confidence */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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
                        {/* Level bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {rows.map(row => {
                            const pct   = Math.round(((row.avgBaseSalary ?? 0) / maxLevelVal) * 100);
                            const color = LEVEL_COLORS[row.internalLevel] ?? BAR_COLORS[ci % BAR_COLORS.length];
                            return (
                              <div key={row.internalLevel} className="level-bar-row">
                                <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 130, fontFamily: "'IBM Plex Mono',monospace" }}>{row.internalLevel}</span>
                                <div className="level-bar-track">
                                  <div className="level-bar-fill" style={{ width: `${pct}%`, background: color }} />
                                </div>
                                <span className="level-bar-val">{fmt(row.avgBaseSalary)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>{/* ── end chart grid ── */}

          {/* ── TOP 10 PAYING COMPANIES ── */}
          <div className="chart-card" style={{ marginBottom: 12 }}>
            <div className="chart-card-header">
              <div className="chart-title">🏆 Top 10 Paying Companies</div>
              <div className="chart-subtitle">Ranked by avg base salary · approved submissions only</div>
            </div>
            {byCompany.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {byCompany.slice(0, 10).map((co, i) => {
                  const pct   = Math.round(((co.avgBaseSalary ?? 0) / maxCo) * 100);
                  const color = BAR_COLORS[i % BAR_COLORS.length];
                  return (
                    <div key={co.groupKey} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', fontFamily: "'IBM Plex Mono',monospace", minWidth: 18, textAlign: 'right' }}>
                        {i + 1}
                      </span>
                      <CompanyLogo
                        companyId={co.companyId}
                        companyName={co.groupKey ?? ''}
                        logoUrl={co.logoUrl}
                        website={co.website}
                        size={28}
                        radius={7}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {co.groupKey}
                            </span>
                            <ConfidenceBadge tier={co.confidenceTier} label={co.confidenceLabel} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace", flexShrink: 0 }}>
                            {fmt(co.avgBaseSalary)}
                          </span>
                        </div>
                        <div className="level-bar-track">
                          <div className="level-bar-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </>
      )}
    </section>
  );
}

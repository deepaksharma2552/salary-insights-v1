import { useState, useEffect } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

export default function DashboardPage() {
  const [byLocation,      setByLocation]      = useState([]);
  const [byCompany,       setByCompany]       = useState([]);
  const [byCompanyLevel,  setByCompanyLevel]  = useState([]);
  const [loading,    setLoading]    = useState(true);

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

  const maxLoc = byLocation.length
    ? Math.max(...byLocation.map(r => r.avgBaseSalary ?? 0), 1)
    : 1;

  const maxCo = byCompany.length
    ? Math.max(...byCompany.slice(0,10).map(r => r.avgBaseSalary ?? 0), 1)
    : 1;

  const BAR_COLORS = [
    '#2563eb','#0891b2','#7c3aed','#16a34a',
    '#ea580c','#e11d48','#d97706','#0284c7',
  ];

  const EmptyState = () => (
    <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-3)', fontSize:13 }}>
      No data available yet.
    </div>
  );

  return (
    <section className="section">

      {/* ── HEADER ── */}
      <div className="section-header">
        <span className="section-tag">Analytics</span>
        <h2 className="section-title">360° Compensation <em>Intelligence</em></h2>
        <p style={{ fontSize:13, color:'var(--text-3)', marginTop:6 }}>
          Aggregated salary data across all approved submissions
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", fontSize:13 }}>
          Loading analytics…
        </div>
      ) : (
        <>
          {/* ── CHART GRID — side by side, wraps on small screens ── */}
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
                          <div className="level-bar-fill" style={{ width:`${pct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                        </div>
                        <span className="level-bar-val">{fmt(row.avgBaseSalary)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chart 2 — Avg Base Salary by Company + Internal Level */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div className="chart-title">Avg Base Salary by Company &amp; Level</div>
                <div className="chart-subtitle">Breakdown by internal level per company</div>
              </div>
              {byCompanyLevel.length === 0 ? <EmptyState /> : (() => {
                // Group by company
                const grouped = byCompanyLevel.reduce((acc, row) => {
                  if (!acc[row.companyName]) acc[row.companyName] = [];
                  acc[row.companyName].push(row);
                  return acc;
                }, {});
                const companies = Object.keys(grouped).slice(0, 6);
                const maxVal = Math.max(...byCompanyLevel.map(r => r.avgBaseSalary ?? 0), 1);
                const LEVEL_COLORS = {
                  'SDE 1': '#0ea5e9', 'SDE 2': '#6366f1', 'SDE 3': '#8b5cf6',
                  'Staff Engineer': '#10b981', 'Principal Engineer': '#059669',
                  'Architect': '#f59e0b', 'Engineering Manager': '#f97316',
                  'Sr. Engineering Manager': '#ef4444', 'Director': '#dc2626',
                  'Sr. Director': '#b91c1c', 'VP': '#7f1d1d',
                };
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {companies.map((company, ci) => (
                      <div key={company}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CompanyLogo
                            companyId={grouped[company][0]?.companyId}
                            companyName={company}
                            logoUrl={grouped[company][0]?.logoUrl}
                            website={grouped[company][0]?.website}
                            size={20}
                            radius={4}
                          />
                          {company}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {grouped[company].map(row => {
                            const pct = Math.round(((row.avgBaseSalary ?? 0) / maxVal) * 100);
                            const color = LEVEL_COLORS[row.internalLevel] ?? BAR_COLORS[ci % BAR_COLORS.length];
                            return (
                              <div key={row.internalLevel} className="level-bar-row">
                                <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 130, fontFamily: "'IBM Plex Mono',monospace" }}>{row.internalLevel}</span>
                                <div className="level-bar-track">
                                  <div className="level-bar-fill" style={{ width:`${pct}%`, background: color }} />
                                </div>
                                <span className="level-bar-val">{fmt(row.avgBaseSalary)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

          </div>{/* ── end chart grid ── */}

          {/* ── TOP 10 PAYING COMPANIES ── */}
          <div className="chart-card" style={{ marginBottom: 12 }}>
            <div className="chart-card-header">
              <div className="chart-title">🏆 Top 10 Paying Companies</div>
              <div className="chart-subtitle">Ranked by average base salary · approved submissions only</div>
            </div>
            {byCompany.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {byCompany.slice(0, 10).map((co, i) => {
                  const pct = Math.round(((co.avgBaseSalary ?? 0) / maxCo) * 100);
                  const color = BAR_COLORS[i % BAR_COLORS.length];
                  return (
                    <div key={co.groupKey} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Rank */}
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', fontFamily: "'IBM Plex Mono',monospace", minWidth: 18, textAlign: 'right' }}>
                        {i + 1}
                      </span>
                      {/* Logo */}
                      <CompanyLogo
                        companyId={co.companyId}
                        companyName={co.groupKey ?? ''}
                        logoUrl={co.logoUrl}
                        website={co.website}
                        size={28}
                        radius={7}
                      />
                      {/* Bar + Label */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {co.groupKey}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>
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
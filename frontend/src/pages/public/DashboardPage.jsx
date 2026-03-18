import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function DashboardPage() {
  const [byLocation,     setByLocation]     = useState([]);
  const [byCompanyLevel, setByCompanyLevel] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const fmt = (val) => {
    if (!val && val !== 0) return '—';
    const l = val / 100000;
    return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
  };

  const maxLoc = byLocation.length
    ? Math.max(...byLocation.map(r => r.avgBaseSalary ?? 0), 1)
    : 1;

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

  const EmptyState = () => (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>
      No data available yet.
    </div>
  );

  const groupedByCompany = byCompanyLevel.reduce((acc, row) => {
    if (!acc[row.companyName]) acc[row.companyName] = [];
    acc[row.companyName].push(row);
    return acc;
  }, {});
  const companies = Object.keys(groupedByCompany).slice(0, 6);
  const maxCompLevel = byCompanyLevel.length
    ? Math.max(...byCompanyLevel.map(r => r.avgBaseSalary ?? 0), 1)
    : 1;

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
            <div className="chart-card-header">
              <div className="chart-title">Avg Base Salary by Company &amp; Level</div>
              <div className="chart-subtitle">Breakdown by internal level per company</div>
            </div>
            {byCompanyLevel.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {companies.map((company, ci) => (
                  <div key={company}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 4,
                        background: `${BAR_COLORS[ci % BAR_COLORS.length]}22`,
                        border: `1px solid ${BAR_COLORS[ci % BAR_COLORS.length]}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700, color: BAR_COLORS[ci % BAR_COLORS.length],
                        fontFamily: "'IBM Plex Mono',monospace",
                      }}>
                        {company.slice(0, 2).toUpperCase()}
                      </div>
                      {company}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {groupedByCompany[company].map(row => {
                        const pct = Math.round(((row.avgBaseSalary ?? 0) / maxCompLevel) * 100);
                        const color = LEVEL_COLORS[row.internalLevel] ?? BAR_COLORS[ci % BAR_COLORS.length];
                        return (
                          <div key={row.internalLevel} className="level-bar-row">
                            <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 130, fontFamily: "'IBM Plex Mono',monospace" }}>
                              {row.internalLevel}
                            </span>
                            <div className="level-bar-track">
                              <div className="level-bar-fill" style={{ width: `${pct}%`, background: color }} />
                            </div>
                            <span className="level-bar-val">{fmt(row.avgBaseSalary)}</span>
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

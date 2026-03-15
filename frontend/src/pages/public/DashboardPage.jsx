import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function DashboardPage() {
  const [byLevel,    setByLevel]    = useState([]);
  const [byLocation, setByLocation] = useState([]);
  const [byCompany,  setByCompany]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/public/salaries/analytics/by-level'),
      api.get('/public/salaries/analytics/by-location'),
      api.get('/public/salaries/analytics/by-company'),
    ]).then(([lvl, loc, co]) => {
      setByLevel(lvl.data    ?? []);
      setByLocation(loc.data ?? []);
      setByCompany(co.data   ?? []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (val) => {
    if (!val && val !== 0) return '—';
    const l = val / 100000;
    return l >= 100 ? `₹${(l/100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
  };

  const maxSalary = byLevel.length
    ? Math.max(...byLevel.map(r => r.avgBaseSalary ?? 0))
    : 1;

  const LEVEL_COLORS = {
    JUNIOR:    'linear-gradient(90deg,var(--teal),#6de8d0)',
    MID:       'linear-gradient(90deg,var(--gold),var(--gold-light))',
    SENIOR:    'linear-gradient(90deg,#a08ff0,#c8bdf8)',
    LEAD:      'linear-gradient(90deg,var(--rose),#f08fa8)',
    DIRECTOR:  'linear-gradient(90deg,var(--gold),var(--gold-light))',
    VP:        'linear-gradient(90deg,#e89050,#f0b880)',
    C_LEVEL:   'linear-gradient(90deg,#e05c7a,#f08fa8)',
  };

  const maxLoc = byLocation.length
    ? Math.max(...byLocation.map(r => r.avgBaseSalary ?? 0))
    : 1;

  return (
    <section className="section" style={{ background: 'var(--ink-2)' }}>

      {/* ── HEADER ── */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
        <div>
          <span className="section-tag">Analytics</span>
          <h2 className="section-title">360° Compensation <em>Intelligence</em></h2>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
          Loading analytics…
        </div>
      ) : (
        <>
          {/* ── LEVEL BARS + TREND ── */}
          <div className="charts-row">
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-title">Avg Salary by Level</div>
                  <div className="chart-subtitle">Standardized across all companies</div>
                </div>
              </div>
              {byLevel.length === 0 ? (
                <p style={{ color: 'var(--text-3)', fontSize: 14 }}>No data yet.</p>
              ) : (
                <div className="level-bars">
                  {byLevel.map(row => {
                    const pct = Math.round((row.avgBaseSalary / maxSalary) * 100);
                    const color = LEVEL_COLORS[row.level] ?? 'linear-gradient(90deg,var(--gold),var(--gold-light))';
                    const label = row.level.charAt(0) + row.level.slice(1).toLowerCase().replace('_', ' ');
                    return (
                      <div key={row.level} className="level-bar-row">
                        <span className="level-bar-label">{label}</span>
                        <div className="level-bar-track">
                          <div className="level-bar-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="level-bar-val">{fmt(row.avgBaseSalary)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── LOCATION BREAKDOWN ── */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-title">Avg Salary by Location</div>
                  <div className="chart-subtitle">Top metro areas</div>
                </div>
              </div>
              {byLocation.length === 0 ? (
                <p style={{ color: 'var(--text-3)', fontSize: 14 }}>No data yet.</p>
              ) : (
                <div className="level-bars">
                  {byLocation.slice(0, 8).map((row, i) => {
                    const pct = Math.round((row.avgBaseSalary / maxLoc) * 100);
                    const colors = [
                      'linear-gradient(90deg,var(--gold),var(--gold-light))',
                      'linear-gradient(90deg,var(--teal),#6de8d0)',
                      'linear-gradient(90deg,#a08ff0,#c8bdf8)',
                      'linear-gradient(90deg,var(--rose),#f08fa8)',
                    ];
                    return (
                      <div key={row.location} className="level-bar-row">
                        <span className="level-bar-label" style={{ width: 100 }}>{row.location}</span>
                        <div className="level-bar-track">
                          <div className="level-bar-fill" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                        </div>
                        <span className="level-bar-val">{fmt(row.avgBaseSalary)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── TOP COMPANIES TABLE ── */}
          <div className="chart-card" style={{ marginTop: 20 }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-title">Avg Salary by Company</div>
                <div className="chart-subtitle">Ranked by average base salary</div>
              </div>
            </div>
            {byCompany.length === 0 ? (
              <p style={{ color: 'var(--text-3)', fontSize: 14 }}>No data yet.</p>
            ) : (
              <div className="salary-table-wrap">
                <table className="salary-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Company</th>
                      <th>Avg Base Salary</th>
                      <th>Avg Total Comp</th>
                      <th>Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCompany.slice(0, 10).map((row, i) => (
                      <tr key={row.company}>
                        <td style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace" }}>{i + 1}</td>
                        <td><div className="company-name">{row.company}</div></td>
                        <td><div className="salary-amount" style={{ fontSize: 16 }}>{fmt(row.avgBaseSalary)}</div></td>
                        <td><div className="salary-amount" style={{ fontSize: 16 }}>{fmt(row.avgTotalCompensation)}</div></td>
                        <td><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: 'var(--text-2)' }}>{row.count ?? '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

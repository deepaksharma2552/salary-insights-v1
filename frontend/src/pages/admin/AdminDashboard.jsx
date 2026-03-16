import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get('/admin/salaries/dashboard')
      .then(r => {
        console.log('Dashboard response:', r.data);
        setStats(r.data?.data);
      })
      .catch(err => {
        console.error('Dashboard error:', err.response?.status, err.response?.data);
        setError(`Failed to load dashboard (${err.response?.status ?? 'network error'})`);
      })
      .finally(() => setLoading(false));
  }, []);

  const fmt = (val) => {
    if (!val && val !== 0) return '—';
    const l = Number(val) / 100000;
    return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
  };

  const kpis = stats ? [
    { label: 'Total Entries',    value: stats.totalSalaryEntries ?? '—', icon: '📊', cls: 'kpi-icon-teal' },
    { label: 'Pending Review',   value: stats.pendingReviews     ?? '—', icon: '⏳', cls: 'kpi-icon-gold' },
    { label: 'Approved',         value: stats.approvedEntries    ?? '—', icon: '✓',  cls: 'kpi-icon-teal' },
    { label: 'Rejected',         value: stats.rejectedEntries    ?? '—', icon: '✕',  cls: 'kpi-icon-gold' },
    { label: 'Total Companies',  value: stats.totalCompanies     ?? '—', icon: '🏢', cls: 'kpi-icon-teal' },
    { label: 'Active Companies', value: stats.activeCompanies    ?? '—', icon: '✅', cls: 'kpi-icon-gold' },
    { label: 'Level Mappings',   value: stats.totalMappings      ?? '—', icon: '🗂',  cls: 'kpi-icon-teal' },
    { label: 'Avg Base Salary',  value: fmt(stats.avgBaseSalary),        icon: '💰', cls: 'kpi-icon-gold' },
  ] : [];

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>Dashboard</h2>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ padding: '16px 20px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 12, color: 'var(--rose)', fontSize: 13 }}>
          {error}
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            {kpis.map(k => (
              <div key={k.label} className="kpi-card">
                <div className={`kpi-icon ${k.cls}`} style={{ fontSize: 18 }}>{k.icon}</div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value" style={{ fontSize: 28 }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Submission Trend */}
          {stats?.submissionTrend?.length > 0 && (
            <div className="chart-card" style={{ marginTop: 32 }}>
              <div className="chart-card-header">
                <div>
                  <div className="chart-title">Submission Trend</div>
                  <div className="chart-subtitle">Monthly submissions over the last 12 months</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80, marginTop: 16 }}>
                {(() => {
                  const max = Math.max(...stats.submissionTrend.map(r => Number(r.count) || 0), 1);
                  return stats.submissionTrend.map((row, i) => {
                    const pct = Math.round((Number(row.count) / max) * 100);
                    const month = row.month ? new Date(row.month).toLocaleString('en-IN', { month: 'short' }) : '';
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace" }}>{row.count}</div>
                        <div style={{
                          width: '100%', height: `${Math.max(pct, 4)}%`,
                          background: 'linear-gradient(180deg, var(--teal), rgba(62,207,176,0.3))',
                          borderRadius: '4px 4px 0 0', minHeight: 4,
                        }} />
                        <div style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace" }}>{month}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

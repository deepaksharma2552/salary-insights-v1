import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/admin/salaries/dashboard')
      .then(r => {
        const data = r.data?.data ?? r.data;
        setStats(data);
      })
      .catch(err => {
        const status = err.response?.status;
        const msg    = err.response?.data?.message ?? err.message ?? 'Unknown error';
        setError(`${status ?? 'Network error'}: ${msg}`);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (val) => {
    if (val === null || val === undefined) return '—';
    const n = Number(val);
    if (isNaN(n)) return '—';
    if (n === 0) return '₹0';
    const l = n / 100000;
    return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
  };

  const kpis = stats ? [
    { label: 'Total Entries',    value: stats.totalSalaryEntries ?? 0, icon: '📊', cls: 'kpi-icon-teal' },
    { label: 'Pending Review',   value: stats.pendingReviews     ?? 0, icon: '⏳', cls: 'kpi-icon-gold' },
    { label: 'Approved',         value: stats.approvedEntries    ?? 0, icon: '✓',  cls: 'kpi-icon-teal' },
    { label: 'Rejected',         value: stats.rejectedEntries    ?? 0, icon: '✕',  cls: 'kpi-icon-gold' },
    { label: 'Total Companies',  value: stats.totalCompanies     ?? 0, icon: '🏢', cls: 'kpi-icon-teal' },
    { label: 'Active Companies', value: stats.activeCompanies    ?? 0, icon: '✅', cls: 'kpi-icon-gold' },
    { label: 'Avg Base Salary',  value: fmt(stats.avgBaseSalary),      icon: '💰', cls: 'kpi-icon-gold' },
  ] : [];

  return (
    <div style={{ padding: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>Dashboard</h2>
        </div>
        {!loading && (
          <button onClick={load} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: '32px 0 30px' }}>
          <div style={{ width: '100%', height: 3, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius: 99, animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
          </div>
          <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ padding: '16px 20px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 12, color: 'var(--rose)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Failed to load dashboard</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, opacity: 0.85 }}>{error}</div>
          </div>
          <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(224,92,122,0.15)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.3)', borderRadius: 6, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* KPIs */}
      {!loading && !error && stats && (
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
          {stats?.submissionTrend?.length > 0 ? (
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
                        <div style={{ width: '100%', height: `${Math.max(pct, 4)}%`, background: 'linear-gradient(180deg, var(--teal), rgba(62,207,176,0.3))', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                        <div style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace" }}>{month}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 32, padding: '24px 28px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
              No submission trend data yet — salaries will appear here once entries are submitted.
            </div>
          )}
        </>
      )}

      {/* No stats returned at all */}
      {!loading && !error && !stats && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontSize: 13 }}>
          No dashboard data returned. The backend may still be initialising.
          <br/>
          <button onClick={load} style={{ marginTop: 16, padding: '8px 20px', fontSize: 13, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Try again</button>
        </div>
      )}
    </div>
  );
}

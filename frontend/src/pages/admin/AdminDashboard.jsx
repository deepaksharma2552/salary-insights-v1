import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/salaries/dashboard')
      .then(r => setStats(r.data?.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (val) => {
    if (!val && val !== 0) return '—';
    const l = val / 100000;
    return l >= 100 ? `₹${(l/100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
  };

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>Dashboard</h2>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading…</div>
      ) : (
        <div className="dashboard-grid">
          {[
            { label: 'Total Entries',    value: stats?.totalEntries    ?? '—', icon: '📊', cls: 'kpi-icon-teal' },
            { label: 'Pending Review',   value: stats?.pendingCount    ?? '—', icon: '⏳', cls: 'kpi-icon-gold' },
            { label: 'Approved',         value: stats?.approvedCount   ?? '—', icon: '✓',  cls: 'kpi-icon-teal' },
            { label: 'Avg Base Salary',  value: fmt(stats?.avgBaseSalary), icon: '💰', cls: 'kpi-icon-gold' },
          ].map(k => (
            <div key={k.label} className="kpi-card">
              <div className={`kpi-icon ${k.cls}`} style={{ fontSize: 18 }}>{k.icon}</div>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: 28 }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

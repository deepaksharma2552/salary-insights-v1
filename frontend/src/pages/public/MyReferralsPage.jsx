import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';

const STATUS_META = {
  PENDING:  { label: 'Pending',  bg: 'rgba(234,179,8,0.12)',   color: '#ca8a04', border: 'rgba(234,179,8,0.25)' },
  ACCEPTED: { label: 'Accepted', bg: 'rgba(34,197,94,0.12)',   color: '#16a34a', border: 'rgba(34,197,94,0.25)' },
  REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.12)',   color: '#dc2626', border: 'rgba(239,68,68,0.25)' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: m.bg, color: m.color,
      border: `1px solid ${m.border}`,
      fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.04em',
    }}>
      {m.label}
    </span>
  );
}

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function MyReferralsPage() {
  const location = useLocation();
  const [referrals, setReferrals] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [banner,    setBanner]    = useState(location.state?.submitted ?? false);

  useEffect(() => {
    api.get('/referrals/mine', { params: { page: 0, size: 50 } })
      .then(r => setReferrals(r.data?.data?.content ?? []))
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load referrals.'))
      .finally(() => setLoading(false));
  }, []);

  // Dismiss success banner after 4 s
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(false), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const counts = {
    PENDING:  referrals.filter(r => r.status === 'PENDING').length,
    ACCEPTED: referrals.filter(r => r.status === 'ACCEPTED').length,
    REJECTED: referrals.filter(r => r.status === 'REJECTED').length,
  };

  return (
    <section className="section">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        .ref-row:hover { background: var(--ink-2) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <span className="section-tag">My Account</span>
          <h2 className="section-title" style={{ marginTop: 4 }}>My <em>Referrals</em></h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>
            Track every candidate you've referred and their current status.
          </p>
        </div>
        <Link to="/refer" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, fontSize: 14 }}>
          + Refer Someone
        </Link>
      </div>

      {/* Success banner */}
      {banner && (
        <div style={{
          padding: '12px 18px', marginBottom: 20, borderRadius: 10,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
          color: '#16a34a', fontSize: 13, fontWeight: 500,
          animation: 'fadeIn 0.3s ease',
        }}>
          ✓ Referral submitted — it will appear below as Pending until reviewed by the team.
        </div>
      )}

      {/* Summary cards */}
      {!loading && !error && referrals.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { key: 'PENDING',  label: 'Pending'  },
            { key: 'ACCEPTED', label: 'Accepted' },
            { key: 'REJECTED', label: 'Rejected' },
          ].map(({ key, label }) => {
            const m = STATUS_META[key];
            return (
              <div key={key} style={{
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '18px 20px',
              }}>
                <div style={{ fontSize: 26, fontWeight: 600, color: m.color, lineHeight: 1 }}>
                  {counts[key]}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
          Loading your referrals…
        </div>
      )}

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 10, color: 'var(--rose)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !error && referrals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <h3 style={{ color: 'var(--text-1)', marginBottom: 8 }}>No referrals yet</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 24 }}>
            Know someone who'd be a great fit? Refer them and track the outcome here.
          </p>
          <Link to="/refer" className="btn-primary" style={{ textDecoration: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 14 }}>
            Submit your first referral →
          </Link>
        </div>
      )}

      {/* Table */}
      {!loading && !error && referrals.length > 0 && (
        <div className="salary-table-wrap">
          <table className="salary-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th>Company</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Note from team</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(r => (
                <tr key={r.id} className="ref-row" style={{ transition: 'background 0.15s' }}>

                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>{r.candidateName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                      {r.candidateEmail}
                    </div>
                  </td>

                  <td style={{ color: 'var(--text-2)', fontSize: 13 }}>
                    {r.jobTitle || '—'}
                  </td>

                  <td>
                    <div className="company-name" style={{ fontSize: 13 }}>{r.companyName}</div>
                  </td>

                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text-3)' }}>
                    <div>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}</div>
                    <div style={{ marginTop: 2 }}>{r.createdAt ? daysSince(r.createdAt) : ''}</div>
                  </td>

                  <td>
                    <StatusBadge status={r.status} />
                  </td>

                  <td style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 220 }}>
                    {r.adminNote
                      ? <span style={{ color: 'var(--text-2)' }}>{r.adminNote}</span>
                      : <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

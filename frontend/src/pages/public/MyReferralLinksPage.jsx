import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function ExpiryCell({ expiresAt }) {
  const days = daysUntil(expiresAt);
  if (days === null) return <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
  const expired = days <= 0;
  const soon    = days > 0 && days <= 3;
  const warning = days > 3 && days <= 7;
  const color   = expired ? '#dc2626' : soon ? '#dc2626' : warning ? '#ca8a04' : 'var(--text-3)';
  const label   = expired
    ? 'Expired'
    : `${new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}${soon ? ` (${days}d left)` : ''}`;
  return (
    <span style={{ fontSize: 11, color, fontFamily: "'JetBrains Mono',monospace", fontWeight: soon || expired ? 600 : 400 }}>
      {label}
    </span>
  );
}

const STATUS_META = {
  PENDING:  { label: 'Pending',  bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04', border: 'rgba(234,179,8,0.25)' },
  ACCEPTED: { label: 'Accepted', bg: 'rgba(34,197,94,0.12)',  color: '#16a34a', border: 'rgba(34,197,94,0.25)' },
  REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', border: 'rgba(239,68,68,0.25)' },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, background: m.bg, color: m.color,
      border: `1px solid ${m.border}`, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.04em',
    }}>
      {m.label}
    </span>
  );
}

function daysSince(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default function MyReferralLinksPage() {
  const location = useLocation();
  const [referrals, setReferrals] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [banner,    setBanner]    = useState(location.state?.submitted ?? false);

  useEffect(() => {
    api.get('/referrals/mine', { params: { page: 0, size: 50 } })
      .then(r => setReferrals(r.data?.data?.content ?? []))
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load your referral links.'))
      .finally(() => setLoading(false));
  }, []);

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
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <span className="section-tag">My Account</span>
          <h2 className="section-title" style={{ marginTop: 4 }}>My Referral <em>Links</em></h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>
            Track every referral link you've submitted and its review status.
          </p>
        </div>
        <Link to="/refer" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, fontSize: 14 }}>
          + Add a Referral
        </Link>
      </div>

      {/* Success banner */}
      {banner && (
        <div style={{
          padding: '12px 18px', marginBottom: 20, borderRadius: 10,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
          color: '#16a34a', fontSize: 13, fontWeight: 500, animation: 'fadeIn 0.3s ease',
        }}>
          ✓ Referral submitted — pending admin review before it appears publicly.
        </div>
      )}

      {/* Summary cards */}
      {!loading && !error && referrals.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {['PENDING', 'ACCEPTED', 'REJECTED'].map(key => {
            const m = STATUS_META[key];
            return (
              <div key={key} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 600, color: m.color, lineHeight: 1 }}>{counts[key]}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{m.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
          Loading your referral links…
        </div>
      )}

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 10, color: 'var(--rose)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !error && referrals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
          <h3 style={{ color: 'var(--text-1)', marginBottom: 8 }}>No referral links yet</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 24 }}>Submit a referral link and track its status here.</p>
          <Link to="/refer" className="btn-primary" style={{ textDecoration: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 14 }}>
            Add your first referral →
          </Link>
        </div>
      )}

      {!loading && !error && referrals.length > 0 && (
        <div className="salary-table-wrap">
          <table className="salary-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Referral Link</th>
                <th>Submitted</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Note from team</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(r => (
                <tr key={r.id} style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CompanyLogo
                        companyId={r.companyId}
                        companyName={r.companyName}
                        website={r.website}
                        size={32}
                        radius={8}
                      />
                      <div className="company-name" style={{ fontSize: 14 }}>{r.companyName}</div>
                    </div>
                  </td>

                  <td>
                    {r.referralLink ? (
                      <a href={r.referralLink} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#0ea5e9', textDecoration: 'none', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title={r.referralLink}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Open link
                      </a>
                    ) : <span style={{ color: 'var(--text-4)', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>—</span>}
                  </td>

                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text-3)' }}>
                    <div>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}</div>
                    <div style={{ marginTop: 2 }}>{r.createdAt ? daysSince(r.createdAt) : ''}</div>
                  </td>

                  <td><ExpiryCell expiresAt={r.expiresAt} /></td>

                  <td><StatusBadge status={r.status} /></td>

                  <td style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 220 }}>
                    {r.adminNote
                      ? <span style={{ color: 'var(--text-2)' }}>{r.adminNote}</span>
                      : <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>—</span>}
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

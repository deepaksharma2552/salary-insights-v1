import { useState, useEffect } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  return days;
}

function ExpiryBadge({ expiresAt }) {
  const days = daysUntil(expiresAt);
  if (days === null) return <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
  const urgent = days <= 5;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace",
      background: urgent ? 'rgba(239,68,68,0.1)' : 'rgba(14,165,233,0.1)',
      color: urgent ? '#dc2626' : '#0284c7',
      border: `1px solid ${urgent ? 'rgba(239,68,68,0.25)' : 'rgba(14,165,233,0.25)'}`,
    }}>
      {days <= 0 ? 'Expires today' : `${days}d left`}
    </span>
  );
}

export default function ViewReferralsPage() {
  const [referrals, setReferrals] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    api.get('/public/referrals', { params: { page: 0, size: 100 } })
      .then(r => setReferrals(r.data?.data?.content ?? []))
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load referrals.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = referrals.filter(r =>
    !search || r.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="section">

      {/* Header */}
      <div className="section-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="section-tag">Community</span>
          <h2 className="section-title">Referral <em>Board</em></h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>
            Referral links shared by our community — click Apply to use the link directly.
          </p>
        </div>
        {/* Entry count badge */}
        {!loading && referrals.length > 0 && (
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--text-3)', padding: '6px 14px', background: 'var(--ink-3)', border: '1px solid var(--border)', borderRadius: 8 }}>
            {referrals.length} active referral{referrals.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Search */}
      {!loading && !error && referrals.length > 0 && (
        <div style={{ margin: '24px 0 16px', position: 'relative', maxWidth: 360 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="form-input"
            type="text"
            placeholder="Search by company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
          Loading referrals…
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 10, color: 'var(--rose)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && referrals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
          <h3 style={{ color: 'var(--text-1)', marginBottom: 8 }}>No referrals yet</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
            Referral links shared by the community will appear here once approved.
          </p>
        </div>
      )}

      {/* No search match */}
      {!loading && !error && referrals.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          No results for "<strong>{search}</strong>"
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="salary-table-wrap">
          <table className="salary-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Shared by</th>
                <th>Posted</th>
                <th>Expires</th>
                <th>Apply</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>

                  {/* Company — logo + name */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CompanyLogo
                        companyId={r.companyId}
                        companyName={r.companyName}
                        website={r.website}
                        size={32}
                        radius={8}
                      />
                      <div className="company-name" style={{ fontSize: 14 }}>
                        {r.companyName || '—'}
                      </div>
                    </div>
                  </td>

                  {/* Shared by */}
                  <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                    {r.referredByName || 'Community member'}
                  </td>

                  {/* Posted date */}
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>

                  {/* Expiry badge */}
                  <td>
                    <ExpiryBadge expiresAt={r.expiresAt} />
                  </td>

                  {/* Apply button */}
                  <td>
                    {r.referralLink ? (
                      <a
                        href={r.referralLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 16px', borderRadius: 8,
                          background: '#0ea5e9', color: 'white',
                          fontWeight: 600, fontSize: 13, textDecoration: 'none',
                          transition: 'background 0.15s', whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#0284c7'}
                        onMouseLeave={e => e.currentTarget.style.background = '#0ea5e9'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Apply
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-4)' }}>—</span>
                    )}
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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

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
          <span className="section-tag">Referrals</span>
          <h2 className="section-title">View Referral <em>Opportunities</em></h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>
            Referral links shared by our community. Click Apply to use the link directly.
          </p>
        </div>
        <Link
          to="/refer"
          className="btn-primary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, fontSize: 14, whiteSpace: 'nowrap' }}
        >
          + Add a Referral
        </Link>
      </div>

      {/* Search */}
      {!loading && !error && referrals.length > 0 && (
        <div style={{ margin: '24px 0 20px', position: 'relative', maxWidth: 360 }}>
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
          Loading opportunities…
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 10, color: 'var(--rose)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && referrals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
          <h3 style={{ color: 'var(--text-1)', marginBottom: 8 }}>No referral opportunities yet</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 24 }}>
            Be the first to share a referral link for an open role.
          </p>
          <Link to="/refer" className="btn-primary" style={{ textDecoration: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 14 }}>
            Add the first referral →
          </Link>
        </div>
      )}

      {/* No search match */}
      {!loading && !error && referrals.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          No results for "<strong>{search}</strong>"
        </div>
      )}

      {/* Card grid */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 8 }}>
          {filtered.map(r => <ReferralCard key={r.id} r={r} />)}
        </div>
      )}
    </section>
  );
}

function ReferralCard({ r }) {
  const initials = r.companyName ? r.companyName.slice(0, 2).toUpperCase() : '??';
  return (
    <div
      style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#0ea5e9'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Company */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#0ea5e9', fontFamily: "'JetBrains Mono',monospace",
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-1)' }}>{r.companyName || '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>
            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </div>
        </div>
      </div>

      {/* Shared by */}
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
        Shared by <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{r.referredByName || 'a community member'}</span>
      </div>

      {/* Apply button */}
      <div style={{ marginTop: 'auto' }}>
        {r.referralLink ? (
          <a
            href={r.referralLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '10px 0', borderRadius: 10,
              background: '#0ea5e9', color: 'white',
              fontWeight: 600, fontSize: 14, textDecoration: 'none', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#0284c7'}
            onMouseLeave={e => e.currentTarget.style.background = '#0ea5e9'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Apply via Referral
          </a>
        ) : (
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-4)', padding: '10px 0' }}>No link available</div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

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
      fontSize: 11, fontWeight: 600,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.04em',
    }}>
      {m.label}
    </span>
  );
}

export default function AdminReferrals() {
  const [referrals,    setReferrals]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [adminNote,    setAdminNote]    = useState('');
  const [actioning,    setActioning]    = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    const params = { page: 0, size: 50 };
    if (statusFilter) params.status = statusFilter;
    api.get('/admin/referrals', { params })
      .then(r => setReferrals(r.data?.data?.content ?? []))
      .catch(err => setFetchError(`${err.response?.status ?? 'Network error'}: ${err.response?.data?.message ?? err.message}`))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function accept(id) {
    setActioning(true);
    try {
      await api.patch(`/admin/referrals/${id}/status`, { status: 'ACCEPTED' });
      load();
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setActioning(true);
    try {
      await api.patch(`/admin/referrals/${rejectTarget.id}/status`, {
        status: 'REJECTED',
        adminNote: adminNote || null,
      });
      setRejectTarget(null);
      setAdminNote('');
      load();
    } catch (e) { console.error(e); }
    finally { setActioning(false); }
  }

  const total   = referrals.length;
  const pending = referrals.filter(r => r.status === 'PENDING').length;

  return (
    <div style={{ padding: 40 }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; animation:fadeIn 0.15s ease; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>
          Referral Board{' '}
          <span style={{ fontSize: 18, color: 'var(--text-3)' }}>
            ({total} total{pending > 0 ? `, ${pending} pending` : ''})
          </span>
        </h2>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['', 'PENDING', 'ACCEPTED', 'REJECTED'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: `1px solid ${statusFilter === f ? '#0ea5e9' : 'var(--border)'}`,
              background: statusFilter === f ? 'rgba(14,165,233,0.1)' : 'transparent',
              color: statusFilter === f ? '#0ea5e9' : 'var(--text-2)',
              transition: 'all 0.15s',
            }}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {/* Error */}
      {fetchError && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 10, color: 'var(--rose)', fontSize: 13, marginBottom: 20 }}>
          {fetchError}
          <button onClick={load} style={{ marginLeft: 14, padding: '3px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 6, border: '1px solid var(--rose)', background: 'transparent', color: 'var(--rose)' }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading…</div>
      )}

      {/* Empty */}
      {!loading && !fetchError && referrals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, color: 'var(--text-2)' }}>
            {statusFilter ? `No ${statusFilter.toLowerCase()} referrals` : 'No referrals yet'}
          </div>
        </div>
      )}

      {/* Table — 5 columns matching ReferralResponse fields exactly */}
      {!loading && !fetchError && referrals.length > 0 && (
        <div className="salary-table-wrap">
          <table className="salary-table">
            <thead>
              <tr>
                <th>Submitted by</th>
                <th>Company</th>
                <th>Referral Link</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(r => (
                <tr key={r.id}>

                  {/* Submitted by — referredByName + referredByEmail from ReferralResponse */}
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                      {r.referredByName || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                      {r.referredByEmail || ''}
                    </div>
                  </td>

                  {/* Company */}
                  <td>
                    <div className="company-name" style={{ fontSize: 14 }}>
                      {r.companyName || '—'}
                    </div>
                  </td>

                  {/* Referral link */}
                  <td>
                    {r.referralLink ? (
                      <a
                        href={r.referralLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={r.referralLink}
                        style={{
                          color: '#0ea5e9', textDecoration: 'none',
                          fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Open link
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-4)', fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text-3)' }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>

                  {/* Status + admin note */}
                  <td>
                    <StatusBadge status={r.status} />
                    {r.adminNote && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, maxWidth: 160 }} title={r.adminNote}>
                        {r.adminNote.length > 40 ? r.adminNote.slice(0, 40) + '…' : r.adminNote}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td>
                    {r.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => accept(r.id)}
                          disabled={actioning}
                          style={{
                            padding: '5px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: 'rgba(34,197,94,0.1)', color: '#16a34a',
                            border: '1px solid rgba(34,197,94,0.25)', borderRadius: 7,
                          }}
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => { setRejectTarget(r); setAdminNote(''); }}
                          disabled={actioning}
                          style={{
                            padding: '5px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: 'var(--rose-dim)', color: 'var(--rose)',
                            border: '1px solid rgba(224,92,122,0.2)', borderRadius: 7,
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
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

      {/* Reject modal */}
      {rejectTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRejectTarget(null)}>
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, margin: '0 16px',
          }}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: 'var(--text-1)', marginBottom: 6 }}>
              Reject referral
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>
              <strong style={{ color: 'var(--text-2)' }}>{rejectTarget.companyName}</strong>
              {' '}submitted by {rejectTarget.referredByName}
            </p>

            <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
              Reason <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(shown to submitter — optional)</span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Broken link, duplicate submission…"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              style={{ resize: 'vertical', width: '100%', marginBottom: 20 }}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className="btn-ghost"
                style={{ padding: '9px 20px', fontSize: 13 }}
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={actioning}
                style={{
                  padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8,
                  background: 'var(--rose-dim)', color: 'var(--rose)',
                  border: '1px solid rgba(224,92,122,0.3)',
                  opacity: actioning ? 0.65 : 1,
                }}
              >
                {actioning ? 'Rejecting…' : 'Confirm reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import TopProgressBar from '../../components/shared/TopProgressBar';

const STATUS_META = {
  PENDING:  { label: 'Pending',     bg: 'rgba(234,179,8,0.12)',  color: '#ca8a04', border: 'rgba(234,179,8,0.25)' },
  ACCEPTED: { label: 'Accepted',    bg: 'rgba(34,197,94,0.12)',  color: '#16a34a', border: 'rgba(34,197,94,0.25)' },
  REJECTED: { label: 'Rejected',    bg: 'rgba(239,68,68,0.12)',  color: '#dc2626', border: 'rgba(239,68,68,0.25)' },
  PAUSED:   { label: 'Paused',      bg: 'rgba(100,116,139,0.1)', color: '#64748b', border: 'rgba(100,116,139,0.2)' },
};

function StatusBadge({ status, active }) {
  // ACCEPTED + active=false → show as Paused
  const key = (status === 'ACCEPTED' && active === false) ? 'PAUSED' : status;
  const m   = STATUS_META[key] ?? STATUS_META.PENDING;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '0.04em',
    }}>
      {m.label}
    </span>
  );
}

export default function AdminReferrals() {
  const [referrals,    setReferrals]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(null);
  const [statusFilter, setStatusFilter] = useState('');   // '' | 'PENDING' | 'ACCEPTED' | 'REJECTED'
  const [pausedOnly,   setPausedOnly]   = useState(false);
  const [actioning,    setActioning]    = useState(null); // referral id being actioned

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [adminNote,    setAdminNote]    = useState('');

  /* ── Load ─────────────────────────────────────────────────────────────────── */
  const load = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    const params = { page: 0, size: 50 };
    if (pausedOnly)          params.paused = true;
    else if (statusFilter)   params.status = statusFilter;
    api.get('/admin/referrals', { params })
      .then(r => {
        const refs = r.data?.data?.content ?? [];
        console.log('[AdminReferrals] loaded:', refs.length);
        setReferrals(refs);
      })
      .catch(err => setFetchError(`${err.response?.status ?? 'Network error'}: ${err.response?.data?.message ?? err.message}`))
      .finally(() => setLoading(false));
  }, [statusFilter, pausedOnly]);

  useEffect(() => { load(); }, [load]);

  /* ── Filter helpers ───────────────────────────────────────────────────────── */
  function setFilter(f) {
    if (f === 'PAUSED') { setPausedOnly(true);  setStatusFilter(''); }
    else                { setPausedOnly(false); setStatusFilter(f);  }
  }
  const activeFilter = pausedOnly ? 'PAUSED' : statusFilter;

  /* ── Actions ──────────────────────────────────────────────────────────────── */
  async function accept(id) {
    setActioning(id); TopProgressBar.start();
    try { await api.patch(`/admin/referrals/${id}/status`, { status: 'ACCEPTED' }); load(); }
    catch (e) { console.error(e); }
    finally { setActioning(null); TopProgressBar.done(); }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setActioning(rejectTarget.id); TopProgressBar.start();
    try {
      await api.patch(`/admin/referrals/${rejectTarget.id}/status`, {
        status: 'REJECTED', adminNote: adminNote || null,
      });
      setRejectTarget(null); setAdminNote(''); load();
    } catch (e) { console.error(e); }
    finally { setActioning(null); TopProgressBar.done(); }
  }

  async function toggleActive(r) {
    setActioning(r.id); TopProgressBar.start();
    try { await api.patch(`/admin/referrals/${r.id}/toggle-active`); load(); }
    catch (e) { console.error(e); }
    finally { setActioning(null); TopProgressBar.done(); }
  }

  /* ── Counts ───────────────────────────────────────────────────────────────── */
  const total   = referrals.length;
  const pending = referrals.filter(r => r.status === 'PENDING').length;
  const paused  = referrals.filter(r => r.status === 'ACCEPTED' && r.active === false).length;

  return (
    <div className="admin-page-content">
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; animation:fadeIn 0.15s ease; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <span className="section-tag">Admin</span>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', marginTop: 4, letterSpacing: '-0.02em' }}>
          Referral Board{' '}
          <span style={{ fontSize: 18, color: 'var(--text-3)' }}>
            ({total} total{pending > 0 ? `, ${pending} pending` : ''}{paused > 0 ? `, ${paused} paused` : ''})
          </span>
        </h2>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { key: '',         label: 'All' },
          { key: 'PENDING',  label: 'Pending' },
          { key: 'ACCEPTED', label: 'Accepted' },
          { key: 'REJECTED', label: 'Rejected' },
          { key: 'PAUSED',   label: '⏸ Paused' },
        ].map(({ key, label }) => {
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: `1px solid ${isActive ? 'var(--blue)' : 'var(--border)'}`,
                background: isActive ? 'var(--blue-dim)' : 'transparent',
                color: isActive ? 'var(--blue)' : 'var(--text-2)',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {fetchError && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 10, color: 'var(--rose)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>{fetchError}</span>
          <button onClick={load} style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 6, border: '1px solid var(--rose)', background: 'transparent', color: 'var(--rose)' }}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: '32px 0 28px' }}>
          <div style={{ width: '100%', height: 3, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius: 99, animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
          </div>
          <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
        </div>
      )}

      {/* Empty */}
      {!loading && !fetchError && referrals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, color: 'var(--text-2)' }}>
            {pausedOnly ? 'No paused referrals' : statusFilter ? `No ${statusFilter.toLowerCase()} referrals` : 'No referrals yet'}
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !fetchError && referrals.length > 0 && (
        <div className="salary-table-wrap">
          <table className="salary-table">
            <thead>
              <tr>
                <th>Submitted by</th>
                <th>Company</th>
                <th>Referral Link</th>
                <th>Date</th>
                <th>Expires</th>
                <th>Status</th>
                <th style={{ minWidth: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(r => {
                const isPaused  = r.status === 'ACCEPTED' && r.active === false;
                const isExpired = r.expiresAt && new Date(r.expiresAt) < new Date();
                const rowOpacity = isPaused || isExpired ? 0.55 : 1;

                return (
                  <tr key={r.id} style={{ opacity: rowOpacity }}>

                    {/* Submitted by */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                        {r.referredByName || '—'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", marginTop: 2 }}>
                        {r.referredByEmail || ''}
                      </div>
                    </td>

                    {/* Company */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CompanyLogo companyId={r.companyId} companyName={r.companyName} website={r.website} size={32} radius={8} />
                        <div className="company-name" style={{ fontSize: 14 }}>{r.companyName || '—'}</div>
                      </div>
                    </td>

                    {/* Link */}
                    <td>
                      {r.referralLink ? (
                        <a
                          href={r.referralLink} target="_blank" rel="noopener noreferrer"
                          title={r.referralLink}
                          style={{ color: 'var(--blue)', textDecoration: 'none', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          Open link
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-4)', fontSize: 11, fontFamily: "'IBM Plex Mono',monospace" }}>—</span>
                      )}
                    </td>

                    {/* Created date */}
                    <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: 'var(--text-3)' }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>

                    {/* Expires */}
                    <td>
                      {(() => {
                        if (!r.expiresAt) return <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
                        const days    = Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / 86_400_000);
                        const expired = days <= 0;
                        const urgent  = days > 0 && days <= 5;
                        return (
                          <div>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: 'var(--text-3)' }}>
                              {new Date(r.expiresAt).toLocaleDateString('en-IN')}
                            </div>
                            <span style={{
                              display: 'inline-block', marginTop: 3, padding: '2px 7px', borderRadius: 99,
                              fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace",
                              background: expired ? 'rgba(107,114,128,0.1)' : urgent ? 'rgba(239,68,68,0.1)' : 'rgba(14,165,233,0.1)',
                              color: expired ? 'var(--text-3)' : urgent ? '#dc2626' : '#0284c7',
                              border: `1px solid ${expired ? 'rgba(107,114,128,0.2)' : urgent ? 'rgba(239,68,68,0.25)' : 'rgba(14,165,233,0.25)'}`,
                            }}>
                              {expired ? 'Expired' : days === 0 ? 'Today' : `${days}d left`}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge status={r.status} active={r.active} />
                      {r.adminNote && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, maxWidth: 160 }} title={r.adminNote}>
                          {r.adminNote.length > 40 ? r.adminNote.slice(0, 40) + '…' : r.adminNote}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {/* PENDING — accept / reject */}
                        {r.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => accept(r.id)}
                              disabled={actioning === r.id}
                              style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 7 }}
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => { setRejectTarget(r); setAdminNote(''); }}
                              disabled={actioning === r.id}
                              style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 7 }}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}

                        {/* ACCEPTED — pause / reactivate toggle */}
                        {r.status === 'ACCEPTED' && (
                          <button
                            onClick={() => toggleActive(r)}
                            disabled={actioning === r.id}
                            style={{
                              padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 7,
                              background: isPaused ? 'rgba(34,197,94,0.1)'    : 'rgba(100,116,139,0.1)',
                              color:      isPaused ? '#16a34a'                 : '#64748b',
                              border:     isPaused ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(100,116,139,0.25)',
                              opacity: actioning === r.id ? 0.5 : 1,
                              transition: 'all 0.15s',
                            }}
                          >
                            {actioning === r.id ? '…' : isPaused ? '▶ Reactivate' : '⏸ Pause'}
                          </button>
                        )}

                        {/* REJECTED — no actions */}
                        {r.status === 'REJECTED' && (
                          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>—</span>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRejectTarget(null)}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, margin: '0 16px' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
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
              className="form-input" rows={3}
              placeholder="e.g. Broken link, duplicate submission…"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              style={{ resize: 'vertical', width: '100%', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" style={{ padding: '9px 20px', fontSize: 13 }} onClick={() => setRejectTarget(null)}>
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!!actioning}
                style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.3)', opacity: actioning ? 0.65 : 1 }}
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

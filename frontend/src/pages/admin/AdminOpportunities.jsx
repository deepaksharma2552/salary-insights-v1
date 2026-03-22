import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const STATUS_META = {
  PENDING:  { label: 'Pending',  bg: 'var(--orange-dim)', color: 'var(--orange)', border: 'rgba(217,119,6,0.25)' },
  LIVE:     { label: 'Live',     bg: 'var(--green-dim)',  color: 'var(--green)',  border: 'rgba(22,163,74,0.25)'  },
  EXPIRED:  { label: 'Expired',  bg: 'var(--bg-3)',       color: 'var(--text-3)', border: 'var(--border)'         },
  REJECTED: { label: 'Rejected', bg: 'var(--red-dim)',    color: 'var(--red)',    border: 'rgba(220,38,38,0.25)'  },
};

const TYPE_LABEL = {
  REFERRAL:   'Referral',
  INTERNSHIP: 'Internship',
  FULL_TIME:  'Full-time',
  CONTRACT:   'Contract',
  DRIVE:      'Drive',
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      fontFamily: "'IBM Plex Mono',monospace",
    }}>{m.label}</span>
  );
}

function TypeBadge({ type }) {
  return (
    <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

export default function AdminOpportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [fetchError,    setFetchError]    = useState(null);
  const [statusFilter,  setStatusFilter]  = useState('PENDING');
  const [actioning,     setActioning]     = useState(null);
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const PAGE_SIZE = 20;

  const load = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    const params = { page, size: PAGE_SIZE };
    if (statusFilter) params.status = statusFilter;
    api.get('/admin/opportunities', { params })
      .then(r => {
        const paged = r.data?.data;
        setOpportunities(paged?.content ?? []);
        setTotalPages(paged?.totalPages ?? 0);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(err => setFetchError(`${err.response?.status ?? 'Network error'}: ${err.response?.data?.message ?? err.message}`))
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  function setFilter(f) { setStatusFilter(f); setPage(0); }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function approve(id) {
    setActioning(id);
    try {
      await api.patch(`/admin/opportunities/${id}/status`, { status: 'LIVE' });
      load();
    } catch (e) { console.error(e); }
    finally { setActioning(null); }
  }

  async function confirmReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActioning(rejectTarget.id);
    try {
      await api.patch(`/admin/opportunities/${rejectTarget.id}/status`, {
        status: 'REJECTED',
        rejectionReason: rejectReason.trim(),
      });
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (e) { console.error(e); }
    finally { setActioning(null); }
  }

  async function remove(id, title) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setActioning(id);
    try { await api.delete(`/admin/opportunities/${id}`); load(); }
    catch (e) { console.error(e); }
    finally { setActioning(null); }
  }

  const pendingCount = statusFilter === 'PENDING' ? totalElements : null;

  return (
    <div style={{ padding: 40 }}>
      <style>{`
        @keyframes adminSpin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <span className="section-tag">Admin</span>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
          Opportunities
          {pendingCount > 0 && (
            <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'var(--orange-dim)', color: 'var(--orange)', border: '1px solid rgba(217,119,6,0.25)' }}>
              {pendingCount} pending
            </span>
          )}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Review and approve community-submitted opportunities before they go live.
        </p>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['PENDING', 'LIVE', 'EXPIRED', 'REJECTED', ''].map(s => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            style={{
              padding: '5px 14px', fontSize: 12, fontWeight: 500, borderRadius: 99,
              border: '1px solid var(--border)', cursor: 'pointer',
              background: statusFilter === s ? 'var(--blue-dim)' : 'transparent',
              color: statusFilter === s ? 'var(--blue)' : 'var(--text-2)',
            }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Error */}
      {fetchError && (
        <div style={{ padding: '12px 16px', background: 'var(--red-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{fetchError}</span>
          <button onClick={load} style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(220,38,38,0.1)', color: 'var(--red)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              {loading ? <><div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(220,38,38,0.2)', borderTopColor: 'var(--red)', animation: 'adminSpin 0.7s linear infinite' }} />Loading…</> : 'Retry'}
            </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", padding: '24px 0' }}>Loading…</div>
      ) : opportunities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          No opportunities with status: {statusFilter || 'Any'}.
        </div>
      ) : (
        <>
          <div className="salary-table-wrap">
            <table className="salary-table">
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>Title</th>
                  <th style={{ width: '14%' }}>Company</th>
                  <th style={{ width: '9%'  }}>Type</th>
                  <th style={{ width: '9%'  }}>Status</th>
                  <th style={{ width: '11%' }}>Apply link</th>
                  <th style={{ width: '9%'  }}>Posted by</th>
                  <th style={{ width: '10%' }}>Submitted</th>
                  <th style={{ width: '16%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map(opp => (
                  <tr key={opp.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 13 }}>{opp.title}</div>
                      {opp.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {opp.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 13 }}>{opp.companyName}</td>
                    <td><TypeBadge type={opp.type} /></td>
                    <td><StatusBadge status={opp.status} /></td>
                    <td>
                      <a href={opp.applyLink} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: 'var(--blue)', textDecoration: 'none', display: 'block', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {opp.applyLink}
                      </a>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{opp.postedByName?.trim() || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
                      {opp.createdAt ? new Date(opp.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>

                        {/* PENDING — primary Approve, secondary Reject */}
                        {opp.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => approve(opp.id)}
                              disabled={actioning === opp.id}
                              style={{
                                padding: '5px 12px', fontSize: 12, fontWeight: 600,
                                background: 'var(--green)', color: 'white',
                                border: 'none', borderRadius: 6, cursor: actioning === opp.id ? 'not-allowed' : 'pointer',
                                opacity: actioning === opp.id ? 0.65 : 1,
                                display: 'flex', alignItems: 'center', gap: 6,
                                whiteSpace: 'nowrap', transition: 'opacity 0.2s',
                              }}>
                              {actioning === opp.id
                                ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'adminSpin 0.7s linear infinite', flexShrink: 0 }} />Approving…</>
                                : '✓ Approve'
                              }
                            </button>
                            <button
                              onClick={() => { setRejectTarget(opp); setRejectReason(''); }}
                              disabled={actioning === opp.id}
                              style={{
                                padding: '5px 10px', fontSize: 12, fontWeight: 500,
                                background: 'var(--red-dim)', color: 'var(--red)',
                                border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6,
                                cursor: actioning === opp.id ? 'not-allowed' : 'pointer',
                                opacity: actioning === opp.id ? 0.5 : 1,
                                whiteSpace: 'nowrap', transition: 'opacity 0.2s',
                              }}>
                              Reject
                            </button>
                          </>
                        )}

                        {/* LIVE — Pull button */}
                        {opp.status === 'LIVE' && (
                          <button
                            onClick={() => { setRejectTarget(opp); setRejectReason('Link broken or expired'); }}
                            disabled={actioning === opp.id}
                            style={{
                              padding: '5px 10px', fontSize: 12, fontWeight: 500,
                              background: 'var(--orange-dim)', color: 'var(--orange)',
                              border: '1px solid rgba(217,119,6,0.25)', borderRadius: 6,
                              cursor: actioning === opp.id ? 'not-allowed' : 'pointer',
                              opacity: actioning === opp.id ? 0.65 : 1,
                              display: 'flex', alignItems: 'center', gap: 6,
                              whiteSpace: 'nowrap', transition: 'opacity 0.2s',
                            }}>
                            {actioning === opp.id
                              ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(217,119,6,0.3)', borderTopColor: 'var(--orange)', animation: 'adminSpin 0.7s linear infinite', flexShrink: 0 }} />Pulling…</>
                              : 'Pull live'
                            }
                          </button>
                        )}

                        {/* Delete — icon only */}
                        <button
                          onClick={() => remove(opp.id, opp.title)}
                          disabled={actioning === opp.id}
                          title="Delete permanently"
                          style={{
                            width: 28, height: 28, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', color: 'var(--text-4)',
                            border: '1px solid var(--border)', borderRadius: 6,
                            cursor: actioning === opp.id ? 'not-allowed' : 'pointer',
                            opacity: actioning === opp.id ? 0.4 : 1,
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={e => { if (actioning !== opp.id) { e.currentTarget.style.background = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.25)'; }}}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                        >
                          {actioning === opp.id
                            ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--text-3)', animation: 'adminSpin 0.7s linear infinite' }} />
                            : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                          }
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination" style={{ padding: '12px 16px' }}>
                <span className="page-info">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}</span>
                <div className="page-btns">
                  <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Reject / Pull modal */}
      {rejectTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
              {rejectTarget.status === 'LIVE' ? 'Pull live opportunity' : 'Reject opportunity'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
              "{rejectTarget.title}" by {rejectTarget.postedByName}
            </p>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Reason <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Link is broken, opportunity has expired, duplicate post…"
              style={{ width: '100%', padding: '9px 12px', fontSize: 13, color: 'var(--text-1)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, outline: 'none', fontFamily: 'Inter,sans-serif', resize: 'vertical', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectTarget(null)} className="btn-ghost">Cancel</button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim() || actioning === rejectTarget?.id}
                style={{
                  padding: '7px 16px', fontSize: 13, fontWeight: 600, color: 'white',
                  background: 'var(--red)', border: 'none', borderRadius: 6,
                  cursor: (!rejectReason.trim() || actioning === rejectTarget?.id) ? 'not-allowed' : 'pointer',
                  opacity: (!rejectReason.trim() || actioning === rejectTarget?.id) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.2s',
                }}>
                {actioning === rejectTarget?.id
                  ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'adminSpin 0.7s linear infinite', flexShrink: 0 }} />Processing…</>
                  : 'Confirm'
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

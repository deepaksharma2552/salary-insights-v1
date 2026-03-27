import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function AdminPendingSalaries() {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(0);
  const [total,    setTotal]    = useState(0);
  const [rejectId, setRejectId] = useState(null);
  const [reason,   setReason]   = useState('');

  const [fetchError, setFetchError] = useState(null);
  const [actioning,  setActioning]  = useState(null);

  // ── AI Enrichment state ────────────────────────────────────────────────────
  const [enrichCompany,  setEnrichCompany]  = useState('');
  const [enrichLoading,  setEnrichLoading]  = useState(false);
  const [enrichResult,   setEnrichResult]   = useState(null);  // { inserted, companyName }
  const [enrichError,    setEnrichError]    = useState(null);

  // ── Salary list ────────────────────────────────────────────────────────────

  const loadSilent = useCallback(() => {
    setFetchError(null);
    api.get('/admin/salaries/pending', { params: { page, size: 10 } })
      .then(r => {
        const paged = r.data?.data;
        setEntries(paged?.content ?? []);
        setTotal(paged?.totalElements ?? 0);
      })
      .catch(err => {
        setFetchError(`Error ${err.response?.status ?? 'network'}: ${err.response?.data?.error ?? err.message}`);
      });
  }, [page]);

  const load = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    api.get('/admin/salaries/pending', { params: { page, size: 10 } })
      .then(r => {
        const paged = r.data?.data;
        setEntries(paged?.content ?? []);
        setTotal(paged?.totalElements ?? 0);
      })
      .catch(err => {
        setFetchError(`Error ${err.response?.status ?? 'network'}: ${err.response?.data?.error ?? err.message}`);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function approve(id) {
    setActioning(id);
    try {
      await api.patch(`/admin/salaries/${id}/approve`);
      loadSilent();
    } catch (e) { console.error(e); }
    finally { setActioning(null); }
  }

  async function reject(id) {
    setActioning(id);
    try {
      await api.patch(`/admin/salaries/${id}/reject`, { reason });
      setRejectId(null);
      setReason('');
      loadSilent();
    } catch (e) { console.error(e); }
    finally { setActioning(null); }
  }

  // ── AI Enrichment ──────────────────────────────────────────────────────────

  async function handleEnrich() {
    if (!enrichCompany.trim()) return;
    setEnrichLoading(true);
    setEnrichResult(null);
    setEnrichError(null);

    try {
      const res = await api.post('/admin/salaries/enrich', { companyName: enrichCompany.trim() });
      const data = res.data?.data;
      setEnrichResult(data);
      // Refresh the pending list so new entries appear immediately
      loadSilent();
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error ?? err.message;
      if (status === 429) {
        setEnrichError(`Rate limited: ${msg}`);
      } else {
        setEnrichError(`Enrichment failed (${status ?? 'network'}): ${msg}`);
      }
    } finally {
      setEnrichLoading(false);
    }
  }

  const fmt = (val) => val ? `₹${(val / 100000).toFixed(1)}L` : '—';

  return (
    <div className="admin-page-content">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progressCrawl {
          0%   { width: 0%;  }
          40%  { width: 65%; }
          70%  { width: 82%; }
          100% { width: 90%; }
        }
        @keyframes enrichPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
      `}</style>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>
          Pending Salaries <span style={{ fontSize: 18, color: 'var(--text-3)' }}>({total})</span>
        </h2>
      </div>

      {/* ── AI Enrichment panel ──────────────────────────────────────────── */}
      <div style={{
        marginBottom: 28,
        padding: '20px 24px',
        borderRadius: 14,
        background: 'rgba(139,92,246,0.06)',
        border: '0.5px solid rgba(139,92,246,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>✦</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(139,92,246,0.9)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI Enrichment</span>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
          Enter a company name and Claude will search the web for real salary data, then queue up to 20 entries for your review.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Google, Flipkart, Zepto…"
            value={enrichCompany}
            onChange={e => { setEnrichCompany(e.target.value); setEnrichResult(null); setEnrichError(null); }}
            onKeyDown={e => { if (e.key === 'Enter' && !enrichLoading) handleEnrich(); }}
            disabled={enrichLoading}
            style={{
              flex: '1 1 260px',
              minWidth: 0,
              opacity: enrichLoading ? 0.6 : 1,
            }}
          />
          <button
            onClick={handleEnrich}
            disabled={enrichLoading || !enrichCompany.trim()}
            style={{
              padding: '9px 22px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'DM Sans',sans-serif",
              background: enrichLoading ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.18)',
              color: 'rgba(167,139,250,1)',
              border: '1px solid rgba(139,92,246,0.35)',
              borderRadius: 9,
              cursor: enrichLoading || !enrichCompany.trim() ? 'not-allowed' : 'pointer',
              opacity: enrichLoading || !enrichCompany.trim() ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s ease, background 0.2s ease',
            }}
          >
            {enrichLoading ? (
              <>
                <div style={{
                  width: 13, height: 13,
                  borderRadius: '50%',
                  border: '2px solid rgba(139,92,246,0.25)',
                  borderTopColor: 'rgba(167,139,250,1)',
                  animation: 'spin 0.8s linear infinite',
                  flexShrink: 0,
                }} />
                Enriching…
              </>
            ) : (
              <>✦ Enrich with AI</>
            )}
          </button>
        </div>

        {/* Progress hint while loading */}
        {enrichLoading && (
          <p style={{
            marginTop: 12, fontSize: 12,
            color: 'rgba(167,139,250,0.7)',
            fontFamily: "'JetBrains Mono',monospace",
            animation: 'enrichPulse 1.8s ease-in-out infinite',
          }}>
            Searching the web and structuring salary data… this takes 5–15 seconds.
          </p>
        )}

        {/* Success toast */}
        {enrichResult && (
          <div style={{
            marginTop: 14,
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            background: 'rgba(62,207,176,0.08)',
            border: '0.5px solid rgba(62,207,176,0.3)',
            borderRadius: 9,
          }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <span style={{ fontSize: 13, color: 'var(--teal)' }}>
              <strong>{enrichResult.inserted}</strong> salary{enrichResult.inserted === 1 ? '' : ' entries'} queued for{' '}
              <strong>{enrichResult.companyName}</strong> — review them in the table below.
            </span>
          </div>
        )}

        {/* Error */}
        {enrichError && (
          <div style={{
            marginTop: 14,
            padding: '10px 16px',
            background: 'var(--rose-dim)',
            border: '0.5px solid rgba(224,92,122,0.25)',
            borderRadius: 9,
            fontSize: 13,
            color: 'var(--rose)',
          }}>
            {enrichError}
          </div>
        )}
      </div>

      {/* ── Data freshness warning ───────────────────────────────────────── */}
      {total > 0 && (
        <div style={{
          marginBottom: 28, padding: '12px 18px', borderRadius: 10, fontSize: 13,
          background: 'rgba(245,158,11,0.07)', border: '0.5px solid rgba(245,158,11,0.35)',
          color: 'var(--text-2)', display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 16, lineHeight: 1.4 }}>⚠️</span>
          <span>
            <strong style={{ color: 'var(--text-1)' }}>Dashboard, Companies, and Salaries pages show no data until entries are approved.</strong>
            {' '}All public salary charts and company stats are built exclusively from approved entries.
            Approve entries below to make them visible.
          </span>
        </div>
      )}

      {/* ── Pending salary table ─────────────────────────────────────────── */}
      {loading ? (
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading…</div>
      ) : fetchError ? (
        <div style={{ padding: '16px 20px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 12, color: 'var(--rose)', fontSize: 13, marginBottom: 20 }}>
          {fetchError}
          <button onClick={load} style={{ marginLeft: 16, padding: '4px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 6, border: '1px solid var(--rose)', background: 'transparent', color: 'var(--rose)' }}>Retry</button>
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
          <div style={{ fontSize: 18, color: 'var(--text-2)' }}>All caught up — no pending entries</div>
        </div>
      ) : (
        <>
          <div className="salary-table-wrap">
            <table className="salary-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Base</th>
                  <th>Total Comp</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td><div className="company-name">{e.companyName ?? e.company?.name}</div></td>
                    <td>{e.jobTitle}</td>
                    <td>{e.location}</td>
                    <td><div className="salary-amount" style={{ fontSize: 15 }}>{fmt(e.baseSalary)}</div></td>
                    <td><div className="salary-amount" style={{ fontSize: 15 }}>{fmt(e.totalCompensation)}</div></td>
                    <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--text-3)' }}>
                      {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => approve(e.id)}
                            disabled={actioning === e.id}
                            style={{
                              padding: '5px 14px', fontSize: 12, fontWeight: 600,
                              background: 'var(--teal-dim)', color: 'var(--teal)',
                              border: '1px solid rgba(62,207,176,0.2)', borderRadius: 7,
                              cursor: actioning === e.id ? 'not-allowed' : 'pointer',
                              opacity: actioning === e.id ? 0.65 : 1,
                              fontFamily: "'DM Sans',sans-serif",
                              display: 'flex', alignItems: 'center', gap: 6,
                              transition: 'opacity 0.2s ease',
                            }}
                          >
                            {actioning === e.id ? (
                              <>
                                <div style={{
                                  width: 11, height: 11, borderRadius: '50%',
                                  border: '1.5px solid rgba(62,207,176,0.3)',
                                  borderTopColor: 'var(--teal)',
                                  animation: 'spin 0.7s linear infinite', flexShrink: 0,
                                }} />
                                Approving…
                              </>
                            ) : '✓ Approve'}
                          </button>
                          <button
                            onClick={() => setRejectId(e.id)}
                            disabled={!!actioning}
                            style={{
                              padding: '5px 14px', fontSize: 12, fontWeight: 600,
                              background: 'var(--rose-dim)', color: 'var(--rose)',
                              border: '1px solid rgba(224,92,122,0.2)', borderRadius: 7,
                              cursor: actioning ? 'not-allowed' : 'pointer',
                              opacity: actioning ? 0.5 : 1,
                              fontFamily: "'DM Sans',sans-serif",
                              transition: 'opacity 0.2s ease',
                            }}
                          >
                            ✕ Reject
                          </button>
                        </div>
                        {actioning === e.id && (
                          <div style={{ width: '100%', height: 3, background: 'rgba(62,207,176,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--teal), #0ea5e9)',
                              borderRadius: 99,
                              animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards',
                            }} />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 10 && (
            <div className="pagination">
              <span className="page-info">Showing {page * 10 + 1}–{Math.min((page + 1) * 10, total)} of {total}</span>
              <div className="page-btns">
                <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button>
                <button className="page-btn" disabled={(page + 1) * 10 >= total} onClick={() => setPage(p => p + 1)}>→</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Reject modal ─────────────────────────────────────────────────── */}
      {rejectId && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setRejectId(null)}
        >
          <div
            style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, padding: 36, width: 440, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: 'var(--text-1)', marginBottom: 8 }}>Reject Entry</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 20 }}>Provide a reason (optional — will be logged in audit trail).</p>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Reason for rejection…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ resize: 'vertical', width: '100%', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-ghost" onClick={() => setRejectId(null)}>Cancel</button>
              <button
                onClick={() => reject(rejectId)}
                style={{ padding: '9px 22px', fontSize: 13, fontWeight: 600, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.3)', borderRadius: 8, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

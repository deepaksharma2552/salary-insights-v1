import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function AdminPendingSalaries() {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(0);
  const [total,    setTotal]    = useState(0);
  const [rejectId, setRejectId] = useState(null);
  const [reason,   setReason]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/salaries/pending', { params: { page, size: 10 } })
      .then(r => {
        setEntries(r.data?.content ?? r.data ?? []);
        setTotal(r.data?.totalElements ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function approve(id) {
    await api.patch(`/admin/salaries/${id}/approve`);
    load();
  }

  async function reject(id) {
    await api.patch(`/admin/salaries/${id}/reject`, { reason });
    setRejectId(null);
    setReason('');
    load();
  }

  const fmt = (val) => val ? `₹${(val/100000).toFixed(1)}L` : '—';

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>
          Pending Salaries <span style={{ fontSize: 18, color: 'var(--text-3)' }}>({total})</span>
        </h2>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading…</div>
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
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => approve(e.id)}
                          style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid rgba(62,207,176,0.2)', borderRadius: 7, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => setRejectId(e.id)}
                          style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 7, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      {/* Reject modal */}
      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setRejectId(null)}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, padding: 36, width: 440, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
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

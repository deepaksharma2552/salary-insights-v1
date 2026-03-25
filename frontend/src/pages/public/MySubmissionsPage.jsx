import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

const fmt = (val) => {
  if (!val && val !== 0) return '—';
  const l = Number(val) / 100000;
  return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
};

const STATUS_CFG = {
  PENDING:  { label: 'Under review', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  APPROVED: { label: 'Approved',     color: '#059669', bg: '#d1fae5', border: '#6ee7b7' },
  REJECTED: { label: 'Rejected',     color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MySubmissionsPage() {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [page,     setPage]     = useState(0);
  const [total,    setTotal]    = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/salaries/my-submissions', { params: { page, size: PAGE_SIZE } })
      .then(r => {
        const paged = r.data?.data;
        setEntries(paged?.content ?? []);
        setTotal(paged?.totalElements ?? 0);
        setTotalPages(paged?.totalPages ?? 1);
      })
      .catch(err => setError(err.response?.data?.error ?? err.message))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="section">
      <div className="section-header">
        <span className="section-tag">Account</span>
        <h2 className="section-title">My Submissions</h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>
          Track the status of your salary submissions
        </p>
      </div>

      {/* Summary strip */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_CFG).map(([status, cfg]) => {
            const count = entries.filter(e => e.reviewStatus === status).length;
            return (
              <div key={status} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 14px', borderRadius: 8,
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                fontSize: 12, fontWeight: 500, color: cfg.color,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color }} />
                {cfg.label}: {count}
              </div>
            );
          })}
          <div style={{
            marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)',
            display: 'flex', alignItems: 'center',
            fontFamily: "'IBM Plex Mono',monospace",
          }}>
            {total} total submission{total !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '16px 20px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)', color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
          Failed to load submissions — {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--border)', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-2)', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>No submissions yet</div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20, lineHeight: 1.6 }}>
            Share your salary anonymously and help the community benchmark their compensation.
          </p>
          <Link to="/submit" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 20px', borderRadius: 8,
            background: 'linear-gradient(135deg,#2563eb,#3b82f6)',
            color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            + Submit your salary
          </Link>
        </div>
      )}

      {/* Table */}
      {!loading && !error && entries.length > 0 && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  {['Company', 'Role', 'Location', 'Total Comp', 'Submitted', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.06em', color: 'var(--text-3)',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: i < entries.length - 1 ? '0.5px solid var(--border)' : 'none' }}>

                    {/* Company */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CompanyLogo
                          companyId={e.companyId}
                          companyName={e.companyName}
                          logoUrl={e.logoUrl}
                          website={e.website}
                          size={24}
                          radius={4}
                        />
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
                          {e.companyName ?? '—'}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{e.jobTitle ?? '—'}</div>
                      {(e.standardizedLevelName ?? e.companyInternalLevel) && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                          {e.standardizedLevelName ?? e.companyInternalLevel}
                        </div>
                      )}
                    </td>

                    {/* Location */}
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {e.location ?? '—'}
                    </td>

                    {/* Total Comp */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>
                        {fmt(e.totalCompensation)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontFamily: "'IBM Plex Mono',monospace" }}>
                        Base {fmt(e.baseSalary)}
                      </div>
                    </td>

                    {/* Submitted date */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', fontFamily: "'IBM Plex Mono',monospace" }}>
                      {formatDate(e.createdAt)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <StatusBadge status={e.reviewStatus} />
                      {e.reviewStatus === 'REJECTED' && e.rejectionReason && (
                        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4, maxWidth: 180, lineHeight: 1.4 }}>
                          {e.rejectionReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ padding: '6px 14px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--bg-2)', fontSize: 12, color: 'var(--text-2)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--bg-2)', fontSize: 12, color: 'var(--text-2)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
          >
            Next →
          </button>
        </div>
      )}

      {/* CTA — always show at bottom if there are entries */}
      {!loading && entries.length > 0 && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link to="/submit" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            color: 'var(--text-2)', fontSize: 12, fontWeight: 500, textDecoration: 'none',
          }}>
            + Submit another salary
          </Link>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}

import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function AdminAuditLogs() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(0);
  const [total,   setTotal]   = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/levels/audit-logs', { params: { page, size: 20 } })
      .then(r => {
        setLogs(r.data?.content ?? r.data ?? []);
        setTotal(r.data?.totalElements ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const ACTION_COLOR = {
    APPROVE: 'status-approved',
    REJECT:  'status-rejected',
    CREATE:  'status-pending',
    UPDATE:  'status-pending',
    DELETE:  'status-rejected',
  };

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>
          Audit Logs <span style={{ fontSize: 18, color: 'var(--text-3)' }}>({total})</span>
        </h2>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>No audit logs yet.</div>
      ) : (
        <>
          <div className="salary-table-wrap">
            <table className="salary-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Performed By</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '—'}
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{log.performedBy ?? '—'}</td>
                    <td>
                      <span className={`status-badge ${ACTION_COLOR[log.action] ?? 'status-pending'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: 13 }}>
                      {log.entityType} <span style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>#{log.entityId?.slice(0, 8)}</span>
                    </td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 20 && (
            <div className="pagination">
              <span className="page-info">Showing {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total}</span>
              <div className="page-btns">
                <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button>
                <button className="page-btn" disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)}>→</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

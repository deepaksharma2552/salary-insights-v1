import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';

const PAGE_SIZE = 20;

const ACTION_OPTIONS = ['APPROVE', 'REJECT', 'CREATE', 'UPDATE', 'DELETE'];

const ACTION_COLOR = {
  APPROVE: 'status-approved',
  REJECT:  'status-rejected',
  CREATE:  'status-pending',
  UPDATE:  'status-pending',
  DELETE:  'status-rejected',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toIso(localDateStr) {
  // converts "2025-03-01" → "2025-03-01T00:00:00" for the API
  return localDateStr ? `${localDateStr}T00:00:00` : undefined;
}

function toIsoEnd(localDateStr) {
  return localDateStr ? `${localDateStr}T23:59:59` : undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminAuditLogs() {
  // Data
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Cursor stack — index 0 = first page (null cursor), each push adds the
  // nextCursor returned by the API so we can go backwards too.
  const [cursorStack, setCursorStack] = useState([null]); // [null] = on page 1
  const currentPage = cursorStack.length; // 1-indexed for display

  // Filters
  const [action,      setAction]      = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [entityType,  setEntityType]  = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');

  // Debounce performer search
  const debounceRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const currentCursor = cursorStack[cursorStack.length - 1];

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = {
      size: PAGE_SIZE,
      ...(currentCursor  && { cursor: currentCursor }),
      ...(action         && { action }),
      ...(performedBy    && { performedBy }),
      ...(entityType     && { entityType }),
      ...(dateFrom       && { from: toIso(dateFrom) }),
      ...(dateTo         && { to:   toIsoEnd(dateTo) }),
    };

    api.get('/admin/audit-logs', { params })
      .then(r => {
        const page = r.data?.data;
        setLogs(page?.content ?? []);
        setHasMore(page?.hasMore ?? false);

        // If we're on the last page push the nextCursor so "Next" can use it.
        // We only push once — avoid pushing the same cursor twice on re-renders.
        if (page?.hasMore && page?.nextCursor) {
          setCursorStack(prev => {
            const last = prev[prev.length - 1];
            // nextCursor already pushed on a previous load of this page? skip.
            if (prev.length > 1 && prev[prev.length - 1] === page.nextCursor) return prev;
            // Are we re-fetching the current page? Don't push.
            return prev;
          });
          // store nextCursor so the "Next" button can push it
          setNextCursor(page.nextCursor);
        } else {
          setNextCursor(null);
        }
      })
      .catch(err => setError(`${err.response?.status ?? 'Network error'}: ${err.response?.data?.message ?? err.message}`))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCursor, action, performedBy, entityType, dateFrom, dateTo]);

  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => { load(); }, [load]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function goNext() {
    if (!nextCursor) return;
    setCursorStack(prev => [...prev, nextCursor]);
  }

  function goPrev() {
    if (cursorStack.length <= 1) return;
    setCursorStack(prev => prev.slice(0, -1));
  }

  // ── Filter reset — go back to page 1 ──────────────────────────────────────

  function resetToFirstPage() {
    setCursorStack([null]);
    setNextCursor(null);
  }

  function handleActionChange(v)     { setAction(v);      resetToFirstPage(); }
  function handleEntityChange(v)     { setEntityType(v);  resetToFirstPage(); }
  function handleDateFromChange(v)   { setDateFrom(v);    resetToFirstPage(); }
  function handleDateToChange(v)     { setDateTo(v);      resetToFirstPage(); }

  function handlePerformerChange(v) {
    setPerformedBy(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => resetToFirstPage(), 400);
  }

  function clearFilters() {
    setAction('');
    setPerformedBy('');
    setEntityType('');
    setDateFrom('');
    setDateTo('');
    resetToFirstPage();
  }

  const hasActiveFilters = action || performedBy || entityType || dateFrom || dateTo;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="admin-page-content">

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <span className="section-tag">Admin</span>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
          Audit Logs
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Admin actions across all entities — newest first.
        </p>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>

        {/* Performer search */}
        <div className="search-box" style={{ minWidth: 180 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="input-field"
            placeholder="Search by admin…"
            value={performedBy}
            onChange={e => handlePerformerChange(e.target.value)}
          />
        </div>

        <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 4px' }} />

        {/* Action filter */}
        <select className="select-field" value={action} onChange={e => handleActionChange(e.target.value)}>
          <option value="">All actions</option>
          {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Entity type filter */}
        <select className="select-field" value={entityType} onChange={e => handleEntityChange(e.target.value)}>
          <option value="">All entities</option>
          {['SALARY', 'COMPANY', 'REFERRAL', 'JOB_FUNCTION', 'GUIDE_LEVEL', 'LEVEL_MAPPING', 'LAUNCHPAD'].map(t => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>

        <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 4px' }} />

        {/* Date range */}
        <input
          type="date"
          className="select-field"
          value={dateFrom}
          onChange={e => handleDateFromChange(e.target.value)}
          style={{ minWidth: 130 }}
          title="From date"
        />
        <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>to</span>
        <input
          type="date"
          className="select-field"
          value={dateTo}
          onChange={e => handleDateToChange(e.target.value)}
          style={{ minWidth: 130 }}
          title="To date"
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              marginLeft: 'auto', padding: '5px 12px', fontSize: 12, fontWeight: 500,
              color: 'var(--text-2)', background: 'var(--bg-3)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 12, color: 'var(--rose)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span>⚠</span>
          <span>{error}</span>
          <button onClick={load} style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'rgba(224,92,122,0.15)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.3)', borderRadius: 6, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", padding: '24px 0' }}>
          Loading…
        </div>
      ) : !error && logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          {hasActiveFilters ? 'No logs match the current filters.' : 'No audit logs yet.'}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="salary-table-wrap">
            <table className="salary-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Performed by</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '—'}
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: 13 }}>
                      {log.performedBy ?? '—'}
                    </td>
                    <td>
                      <span className={`status-badge ${ACTION_COLOR[log.action] ?? 'status-pending'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: 13 }}>
                      {log.entityType}{' '}
                      <span style={{ color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
                        #{log.entityId?.slice(0, 8)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination — prev / page counter / next only, no total count */}
          <div className="pagination" style={{ marginTop: 16 }}>
            <span className="page-info">
              Page {currentPage}
              {hasActiveFilters && <span style={{ marginLeft: 8, color: 'var(--blue)', fontWeight: 500 }}>· filtered</span>}
            </span>
            <div className="page-btns">
              <button
                className="page-btn"
                disabled={cursorStack.length <= 1 || loading}
                onClick={goPrev}
              >
                ← Prev
              </button>
              <button
                className="page-btn"
                disabled={!hasMore || loading}
                onClick={goNext}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

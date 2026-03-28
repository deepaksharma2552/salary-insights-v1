import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */
const fmt     = (val) => val != null ? `₹${(val / 100000).toFixed(1)}L` : '—';
const fmtDate = (d)   => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function formatRelativeTime(isoString) {
  if (!isoString) return null;
  const diffMs  = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 2)   return 'just now';
  if (diffMin < 60)  return `${diffMin} minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr  < 24)  return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30)  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  const diffMo = Math.floor(diffDay / 30);
  return `${diffMo} month${diffMo > 1 ? 's' : ''} ago`;
}

function resolveSource(e) {
  if (e.dataSource && e.dataSource !== 'User') return e.dataSource;
  if (e.submittedByEmail) return 'User';
  return 'AI';
}

/* ─────────────────────────────────────────────────────────────────────────────
   CompanyAvatar — consistent initials avatar matching other admin tables
───────────────────────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  { bg: 'var(--blue-dim)',   fg: 'var(--blue)'   },
  { bg: 'var(--purple-dim)', fg: 'var(--purple)'  },
  { bg: 'var(--green-dim)',  fg: 'var(--green)'   },
  { bg: 'var(--orange-dim)', fg: 'var(--orange)'  },
  { bg: 'rgba(6,182,212,0.1)', fg: '#0891b2'       },
  { bg: 'rgba(99,102,241,0.1)', fg: '#6366f1'      },
];

function companyColor(name = '') {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function CompanyAvatar({ name = '' }) {
  const { bg, fg } = companyColor(name);
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 'var(--radius)', flexShrink: 0,
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SourceBadge
───────────────────────────────────────────────────────────────────────────── */
function SourceBadge({ entry }) {
  const source = resolveSource(entry);
  const isAI   = !entry.submittedByEmail;
  const label  = isAI
    ? (source === 'AI' ? '✦ AI' : `✦ ${source.split(',')[0].trim()}`)
    : '👤 User';

  return (
    <span
      title={source}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 99,
        fontSize: 11, fontWeight: 600,
        fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '0.03em',
        background: isAI ? 'var(--blue-dim)'  : 'var(--green-dim)',
        color:      isAI ? 'var(--blue)'       : 'var(--green)',
        border:     `1px solid ${isAI ? 'rgba(59,130,246,0.2)' : 'rgba(22,163,74,0.2)'}`,
        whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DetailField — one labeled field inside the expanded row
───────────────────────────────────────────────────────────────────────────── */
function DetailField({ label, value, mono = false, highlight = false }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{
        fontSize: 10, fontFamily: "'IBM Plex Mono',monospace",
        color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13,
        fontFamily: mono ? "'IBM Plex Mono',monospace" : 'Inter,sans-serif',
        color:      highlight ? 'var(--blue)' : 'var(--text-1)',
        fontWeight: highlight ? 600 : 400,
      }}>
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ExpandedRow — detail panel + approve / reject actions
───────────────────────────────────────────────────────────────────────────── */
function ExpandedRow({ e, onApprove, onReject, actioning }) {
  const isAI  = !e.submittedByEmail;
  const source = resolveSource(e);

  const equityPerYear    = e.equity           != null ? fmt(e.equity)           : null;
  const equityTotalGrant = e.equityTotalGrant != null ? fmt(e.equityTotalGrant) : null;

  const vestingLabel = (() => {
    if (!equityPerYear || !equityTotalGrant || equityTotalGrant === equityPerYear) return null;
    const perYr = e.equity;
    const total = e.equityTotalGrant;
    if (!perYr || !total || perYr === 0) return null;
    const yrs = Math.round(total / perYr);
    return yrs >= 2 && yrs <= 6 ? `${yrs}-yr vesting` : null;
  })();

  const isActioning = actioning === e.id;

  return (
    <tr>
      <td
        colSpan={10}
        style={{ padding: 0, background: 'transparent', borderBottom: '1px solid var(--border)' }}
      >
        <div style={{
          padding: '18px 20px 18px 28px',
          background: 'var(--bg-2)',
          borderLeft: `3px solid ${isAI ? 'rgba(59,130,246,0.45)' : 'rgba(22,163,74,0.4)'}`,
          animation: 'expandIn 0.18s ease',
        }}>

          {/* Detail grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '14px 20px',
            marginBottom: 18,
          }}>
            <DetailField label="Base Salary"     value={fmt(e.baseSalary)}        highlight mono />
            <DetailField label="Bonus"            value={fmt(e.bonus)}             mono />
            <DetailField
              label={vestingLabel ? `Equity / yr · ${vestingLabel}` : 'Equity / yr'}
              value={equityPerYear}
              mono
            />
            {equityTotalGrant && equityTotalGrant !== equityPerYear && (
              <DetailField label="Total RSU Grant"  value={equityTotalGrant}         mono />
            )}
            <DetailField label="Total Comp"      value={fmt(e.totalCompensation)} highlight mono />
            <DetailField label="Department"      value={e.department} />
            <DetailField label="Exp Level"       value={e.experienceLevel} />
            <DetailField label="Years of Exp"    value={e.yearsOfExperience != null ? `${e.yearsOfExperience} yrs` : null} />
            <DetailField label="Employment"      value={e.employmentType} />
            <DetailField label="Level"           value={e.standardizedLevelName ?? e.functionLevelName} />
            <DetailField label="Job Function"    value={e.jobFunctionName} />
            <DetailField label="Submitted"       value={fmtDate(e.createdAt)}     mono />
            <DetailField label="Source"          value={e.submittedByEmail ?? source} />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onApprove(e.id)}
              disabled={!!actioning}
              style={{
                padding: '6px 18px', fontSize: 12, fontWeight: 600,
                background: 'var(--green-dim)', color: 'var(--green)',
                border: '1px solid rgba(22,163,74,0.25)', borderRadius: 7,
                cursor: actioning ? 'not-allowed' : 'pointer',
                opacity: actioning && !isActioning ? 0.5 : 1,
                fontFamily: 'Inter,sans-serif',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'opacity 0.15s',
              }}
            >
              {isActioning ? (
                <>
                  <div style={{ width: 11, height: 11, borderRadius: '50%', border: '1.5px solid rgba(22,163,74,0.25)', borderTopColor: 'var(--green)', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                  Approving…
                </>
              ) : '✓ Approve'}
            </button>

            <button
              onClick={() => onReject(e.id)}
              disabled={!!actioning}
              style={{
                padding: '6px 18px', fontSize: 12, fontWeight: 600,
                background: 'var(--rose-dim)', color: 'var(--rose)',
                border: '1px solid rgba(224,92,122,0.2)', borderRadius: 7,
                cursor: actioning ? 'not-allowed' : 'pointer',
                opacity: actioning ? 0.5 : 1,
                fontFamily: 'Inter,sans-serif',
                transition: 'opacity 0.15s',
              }}
            >
              ✕ Reject
            </button>

            {isActioning && (
              <div style={{ flex: 1, maxWidth: 140, height: 2, background: 'rgba(22,163,74,0.12)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--green)', borderRadius: 99, animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Spinner — inline loading indicator
───────────────────────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--blue)', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
      Loading…
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PagePills — numbered pagination buttons
───────────────────────────────────────────────────────────────────────────── */
function PagePills({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const delta = 2;
  const left  = Math.max(0, page - delta);
  const right = Math.min(totalPages - 1, page + delta);
  const pages = [];
  if (left > 0) pages.push({ type: 'num', n: 0 });
  if (left > 1) pages.push({ type: 'ellipsis', key: 'l' });
  for (let i = left; i <= right; i++) pages.push({ type: 'num', n: i });
  if (right < totalPages - 2) pages.push({ type: 'ellipsis', key: 'r' });
  if (right < totalPages - 1) pages.push({ type: 'num', n: totalPages - 1 });

  return (
    <>
      {pages.map((p, i) =>
        p.type === 'ellipsis' ? (
          <span key={p.key} style={{ padding: '0 4px', color: 'var(--text-3)', fontSize: 13 }}>…</span>
        ) : (
          <button key={p.n} onClick={() => onChange(p.n)} className={`page-btn${p.n === page ? ' active' : ''}`}>
            {p.n + 1}
          </button>
        )
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AdminPendingSalaries — main component
───────────────────────────────────────────────────────────────────────────── */
export default function AdminPendingSalaries() {
  const [entries,    setEntries]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(0);
  const [total,      setTotal]      = useState(0);
  const [rejectId,   setRejectId]   = useState(null);
  const [reason,     setReason]     = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [actioning,  setActioning]  = useState(null);
  const [expanded,   setExpanded]   = useState(null);

  // Filter state
  const [search, setSearch] = useState('');

  // AI Enrichment state
  const [enrichCompany, setEnrichCompany] = useState('');
  const [enrichState,   setEnrichState]   = useState('idle');
  const [enrichResult,  setEnrichResult]  = useState(null);
  const [enrichError,   setEnrichError]   = useState(null);
  const [enrichInfo,    setEnrichInfo]    = useState(null);
  const [infoLoading,   setInfoLoading]   = useState(false);
  const pollRef     = useRef(null);
  const infoTimerRef = useRef(null);

  useEffect(() => () => { clearInterval(pollRef.current); clearTimeout(infoTimerRef.current); }, []);

  /* ── Data loading ── */
  const loadSilent = useCallback(() => {
    api.get('/admin/salaries/pending', { params: { page, size: 10 } })
      .then(r => {
        const paged = r.data?.data;
        setEntries(paged?.content ?? []);
        setTotal(paged?.totalElements ?? 0);
      })
      .catch(() => {});
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

  /* ── Actions ── */
  async function approve(id) {
    setActioning(id);
    try {
      await api.patch(`/admin/salaries/${id}/approve`);
      setExpanded(null);
      loadSilent();
    } catch (e) { console.error(e); }
    finally     { setActioning(null); }
  }

  async function reject(id) {
    setActioning(id);
    try {
      await api.patch(`/admin/salaries/${id}/reject`, { reason });
      setRejectId(null);
      setReason('');
      setExpanded(null);
      loadSilent();
    } catch (e) { console.error(e); }
    finally     { setActioning(null); }
  }

  function toggleExpand(id) {
    setExpanded(prev => prev === id ? null : id);
  }

  /* ── AI Enrichment ── */
  function fetchEnrichInfo(name) {
    if (!name || name.trim().length < 2) { setEnrichInfo(null); return; }
    setInfoLoading(true);
    api.get('/admin/salaries/enrich/info', { params: { companyName: name.trim() } })
      .then(r => setEnrichInfo(r.data?.data ?? null))
      .catch(() => setEnrichInfo(null))
      .finally(() => setInfoLoading(false));
  }

  function handleCompanyChange(val) {
    setEnrichCompany(val);
    setEnrichResult(null);
    setEnrichError(null);
    if (enrichState !== 'idle') setEnrichState('idle');
    clearTimeout(infoTimerRef.current);
    infoTimerRef.current = setTimeout(() => fetchEnrichInfo(val), 600);
  }

  function stopPolling() { clearInterval(pollRef.current); pollRef.current = null; }

  async function startPolling(jobId) {
    setEnrichState('polling');
    const timeoutId = setTimeout(() => {
      stopPolling();
      setEnrichError('Enrichment is taking too long — the job may have stalled. Check backend logs.');
      setEnrichState('failed');
    }, 90_000);

    pollRef.current = setInterval(async () => {
      try {
        const res  = await api.get(`/admin/salaries/enrich/${jobId}`);
        const data = res.data?.data;
        if (data?.status === 'DONE') {
          clearTimeout(timeoutId); stopPolling();
          setEnrichResult({ inserted: data.inserted, companyName: data.companyName });
          setEnrichState('done');
          loadSilent();
          fetchEnrichInfo(data.companyName);
        } else if (data?.status === 'FAILED') {
          clearTimeout(timeoutId); stopPolling();
          setEnrichError(data.error ?? 'Enrichment failed — check backend logs.');
          setEnrichState('failed');
        }
      } catch (err) {
        clearTimeout(timeoutId); stopPolling();
        setEnrichError(`Polling error: ${err.response?.data?.error ?? err.message}`);
        setEnrichState('failed');
      }
    }, 2000);
  }

  async function handleEnrich() {
    if (!enrichCompany.trim() || isEnriching) return;
    stopPolling();
    setEnrichState('submitting');
    setEnrichResult(null);
    setEnrichError(null);
    try {
      const res   = await api.post('/admin/salaries/enrich', { companyName: enrichCompany.trim() });
      const jobId = res.data?.data?.jobId;
      if (!jobId) throw new Error('No jobId in response');
      await startPolling(jobId);
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error ?? err.message;
      setEnrichError(status === 429 ? `Rate limited: ${msg}` : `Failed to start enrichment: ${msg}`);
      setEnrichState('failed');
    }
  }

  const isEnriching      = enrichState === 'submitting' || enrichState === 'polling';
  const hasTooManyPending = enrichInfo && enrichInfo.pendingCount > 5;
  const enrichBlocked     = isEnriching || hasTooManyPending;

  // Client-side search filter
  const filtered = search.trim()
    ? entries.filter(e => {
        const q = search.toLowerCase();
        return (
          (e.companyName ?? e.company?.name ?? '').toLowerCase().includes(q) ||
          (e.jobTitle ?? '').toLowerCase().includes(q) ||
          (e.location  ?? '').toLowerCase().includes(q)
        );
      })
    : entries;

  const totalPages = Math.ceil(total / 10);

  /* ── Render ── */
  return (
    <div className="admin-page-content">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progressCrawl {
          0%   { width: 0%; }
          40%  { width: 65%; }
          70%  { width: 82%; }
          100% { width: 90%; }
        }
        @keyframes enrichPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.5; }
        }
        @keyframes expandIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pending-row { cursor: pointer; }
        .pending-row td { transition: background 0.12s; }
        .pending-row:hover td { background: var(--bg-2) !important; }
        .pending-row.is-expanded td { background: var(--bg-3) !important; }
        .chevron { display: inline-block; transition: transform 0.18s ease; color: var(--text-4); font-size: 10px; line-height: 1; }
        .chevron.open { transform: rotate(90deg); color: var(--text-3); }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <span className="section-tag">Admin</span>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginTop: 4, letterSpacing: '-0.02em' }}>
            Pending Salaries
            {!loading && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', marginLeft: 10,
                padding: '2px 10px', borderRadius: 20,
                background: total > 0 ? 'var(--orange-dim)' : 'var(--bg-3)',
                color: total > 0 ? 'var(--orange)' : 'var(--text-3)',
                fontSize: 13, fontWeight: 600,
                fontFamily: "'IBM Plex Mono',monospace",
                border: total > 0 ? '1px solid rgba(217,119,6,0.2)' : '1px solid var(--border)',
              }}>
                {total}
              </span>
            )}
          </h2>
        </div>

        <button
          onClick={load}
          style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Warning banner ── */}
      {!loading && total > 0 && (
        <div style={{
          marginBottom: 20, padding: '11px 16px', borderRadius: 10, fontSize: 13,
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.28)',
          color: 'var(--text-2)', display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 15, lineHeight: 1.4, flexShrink: 0 }}>⚠️</span>
          <span>
            <strong style={{ color: 'var(--text-1)' }}>Public pages show no data until entries are approved.</strong>
            {' '}All salary charts and company stats are built from approved entries only.
          </span>
        </div>
      )}

      {/* ── AI Enrichment panel ── */}
      <div style={{
        marginBottom: 24, padding: '18px 22px', borderRadius: 'var(--radius-lg)',
        background: 'var(--blue-dim)', border: '1px solid var(--blue-mid)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: 'var(--blue)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>✦ AI Enrichment</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.6 }}>
          Enter a company name. Claude searches the web for real salary data and queues up to 20 entries for your review.{' '}
          <span title="Claude searches levels.fyi first, then glassdoor and ambitionbox if needed. Results land as PENDING — nothing goes live until you approve." style={{ color: 'var(--blue)', fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", cursor: 'help' }}>ⓘ how it works</span>
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Google, Flipkart, Zepto…"
            value={enrichCompany}
            onChange={e => handleCompanyChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !enrichBlocked) handleEnrich(); }}
            disabled={enrichBlocked}
            style={{ flex: '1 1 240px', minWidth: 0, opacity: enrichBlocked ? 0.6 : 1 }}
          />
          <button
            onClick={handleEnrich}
            disabled={enrichBlocked || !enrichCompany.trim()}
            title={hasTooManyPending ? `Review the ${enrichInfo.pendingCount} pending entries before enriching again` : undefined}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 600,
              fontFamily: 'Inter,sans-serif',
              background: enrichBlocked ? 'var(--blue-dim)' : 'rgba(59,130,246,0.1)',
              color: 'var(--blue)',
              border: '1px solid rgba(59,130,246,0.28)',
              borderRadius: 'var(--radius)',
              cursor: enrichBlocked || !enrichCompany.trim() ? 'not-allowed' : 'pointer',
              opacity: enrichBlocked || !enrichCompany.trim() ? 0.65 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
              whiteSpace: 'nowrap', transition: 'opacity 0.15s',
            }}
          >
            {isEnriching ? (
              <>
                <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.2)', borderTopColor: 'var(--blue)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                {enrichState === 'submitting' ? 'Starting…' : 'Enriching…'}
              </>
            ) : hasTooManyPending ? '⛔ Review pending first' : '✦ Enrich with AI'}
          </button>
        </div>

        {/* Info strip */}
        {(infoLoading || enrichInfo) && !isEnriching && enrichState === 'idle' && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 14, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: 'var(--text-3)' }}>
            {infoLoading ? (
              <span style={{ opacity: 0.6 }}>checking…</span>
            ) : enrichInfo && (
              <>
                <span title="When this company was last enriched">
                  🕐 {enrichInfo.lastEnrichedAt ? `Last enriched ${formatRelativeTime(enrichInfo.lastEnrichedAt)}` : 'Never enriched'}
                </span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span style={{ color: enrichInfo.pendingCount > 5 ? 'var(--rose)' : enrichInfo.pendingCount > 0 ? 'rgba(245,158,11,0.9)' : 'var(--text-3)' }}>
                  {enrichInfo.pendingCount > 5
                    ? `⛔ ${enrichInfo.pendingCount} pending — review before enriching again`
                    : enrichInfo.pendingCount > 0
                    ? `⚠ ${enrichInfo.pendingCount} pending review`
                    : '✓ no pending entries'}
                </span>
              </>
            )}
          </div>
        )}

        {isEnriching && (
          <p style={{ marginTop: 10, fontSize: 12, color: 'rgba(59,130,246,0.7)', fontFamily: "'IBM Plex Mono',monospace", animation: 'enrichPulse 1.8s ease-in-out infinite' }}>
            {enrichState === 'submitting' ? 'Queuing enrichment job…' : 'Claude is searching the web and structuring salary data… this takes 15–45 seconds.'}
          </p>
        )}

        {enrichState === 'done' && enrichResult && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--green-dim)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8 }}>
            <span style={{ fontSize: 15 }}>✓</span>
            <span style={{ fontSize: 13, color: 'var(--green)' }}>
              <strong>{enrichResult.inserted}</strong> {enrichResult.inserted === 1 ? 'entry' : 'entries'} queued for <strong>{enrichResult.companyName}</strong> — review below.
            </span>
          </div>
        )}

        {enrichState === 'failed' && enrichError && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--rose)' }}>
            {enrichError}
          </div>
        )}
      </div>

      {/* ── Filter / search bar ── */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="search-box">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--text-3)' }}>
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            className="input-field"
            placeholder="Filter by company, role or location…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>

        {!loading && (
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", whiteSpace: 'nowrap', marginLeft: 'auto' }}>
            {total} {total === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      {/* ── Hint ── */}
      {!loading && filtered.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, fontFamily: "'IBM Plex Mono',monospace" }}>
          ↓ Click any row to expand full details and take action
        </p>
      )}

      {/* ── States: loading / error / empty ── */}
      {loading ? (
        <Spinner />
      ) : fetchError ? (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 'var(--radius-lg)', color: 'var(--rose)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span>⚠</span>
          <span style={{ flex: 1 }}>{fetchError}</span>
          <button onClick={load} style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 6, border: '1px solid var(--rose)', background: 'transparent', color: 'var(--rose)' }}>Retry</button>
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>✓</div>
          <div style={{ fontSize: 18, color: 'var(--text-2)', marginBottom: 6 }}>All caught up</div>
          <div style={{ fontSize: 13 }}>No pending entries to review</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 13 }}>
          No entries match "<strong style={{ color: 'var(--text-2)' }}>{search}</strong>"
          <button onClick={() => setSearch('')} style={{ marginLeft: 10, fontSize: 12, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>
        </div>
      ) : (

        /* ── Table ── */
        <>
          <div className="salary-table-wrap">
            <table className="salary-table">
              <thead>
                <tr>
                  {/* Chevron col */}
                  <th style={{ width: 32, paddingRight: 0 }} />
                  <th>Company</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Base</th>
                  <th>Bonus</th>
                  <th>Equity</th>
                  <th>Total Comp</th>
                  <th>Source</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const isOpen       = expanded === e.id;
                  const companyName  = e.companyName ?? e.company?.name ?? '—';
                  const isLastRow    = filtered[filtered.length - 1]?.id === e.id && !isOpen;

                  return (
                    <>
                      <tr
                        key={e.id}
                        className={`pending-row${isOpen ? ' is-expanded' : ''}`}
                        onClick={() => toggleExpand(e.id)}
                        style={{ borderBottom: isOpen ? 'none' : undefined }}
                      >
                        {/* Chevron */}
                        <td style={{ width: 32, paddingRight: 0, paddingLeft: 14, textAlign: 'center' }}>
                          <span className={`chevron${isOpen ? ' open' : ''}`}>▶</span>
                        </td>

                        {/* Company */}
                        <td>
                          <div className="company-cell">
                            <CompanyAvatar name={companyName} />
                            <div>
                              <div className="company-name">{companyName}</div>
                              {e.jobFunctionName && (
                                <div className="company-industry">{e.jobFunctionName}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.jobTitle ?? '—'}
                          {e.experienceLevel && (
                            <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace", background: 'var(--bg-3)', color: 'var(--text-3)', letterSpacing: '0.04em' }}>
                              {e.experienceLevel}
                            </span>
                          )}
                        </td>

                        {/* Location */}
                        <td style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                          {e.location ?? '—'}
                        </td>

                        {/* Base */}
                        <td>
                          <div className="salary-amount" style={{ fontSize: 14 }}>{fmt(e.baseSalary)}</div>
                        </td>

                        {/* Bonus */}
                        <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: e.bonus ? 'var(--text-2)' : 'var(--text-4)' }}>
                          {fmt(e.bonus)}
                        </td>

                        {/* Equity */}
                        <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: e.equity ? 'var(--text-2)' : 'var(--text-4)' }}>
                          {fmt(e.equity)}
                        </td>

                        {/* Total comp */}
                        <td>
                          <div className="salary-amount" style={{ fontSize: 14, color: 'var(--text-1)' }}>{fmt(e.totalCompensation)}</div>
                        </td>

                        {/* Source */}
                        <td><SourceBadge entry={e} /></td>

                        {/* Submitted */}
                        <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                          {fmtDate(e.createdAt)}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isOpen && (
                        <ExpandedRow
                          key={`${e.id}-detail`}
                          e={e}
                          onApprove={approve}
                          onReject={id => setRejectId(id)}
                          actioning={actioning}
                        />
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {total > 10 && (
            <div className="pagination">
              <span className="page-info">
                Showing {page * 10 + 1}–{Math.min((page + 1) * 10, total)} of {total.toLocaleString()}
              </span>
              <div className="page-btns">
                <button className="page-btn" disabled={page === 0} onClick={() => { setPage(p => p - 1); setExpanded(null); }}>←</button>
                <PagePills page={page} totalPages={totalPages} onChange={p => { setPage(p); setExpanded(null); }} />
                <button className="page-btn" disabled={(page + 1) * 10 >= total} onClick={() => { setPage(p => p + 1); setExpanded(null); }}>→</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Reject modal ── */}
      {rejectId && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setRejectId(null)}
        >
          <div
            style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', width: 440, maxWidth: '90vw', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Reject Entry</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
              Provide a reason (optional — logged in the audit trail).
            </p>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Reason for rejection…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ resize: 'vertical', width: '100%', marginBottom: 18 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn-ghost" onClick={() => setRejectId(null)}>Cancel</button>
              <button
                onClick={() => reject(rejectId)}
                style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.28)', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}
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

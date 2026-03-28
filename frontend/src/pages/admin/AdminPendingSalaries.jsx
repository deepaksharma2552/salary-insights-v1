import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// Derive the display label for data source
function resolveSource(e) {
  if (e.dataSource && e.dataSource !== 'User') return e.dataSource; // e.g. "levels.fyi, glassdoor"
  if (e.submittedByEmail) return 'User';
  return 'AI'; // fallback for old AI entries without dataSource
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SourceBadge({ entry }) {
  const source = resolveSource(entry);
  const isAI   = !entry.submittedByEmail;

  // Split multi-source strings (e.g. "levels.fyi, glassdoor") and show the first
  const displayLabel = isAI
    ? (source === 'AI' ? '✦ AI' : `✦ ${source.split(',')[0].trim()}`)
    : '👤 User';

  return (
    <span
      title={source}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
        fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '0.04em',
        background: isAI ? 'var(--blue-dim)' : 'var(--green-dim)',
        color:      isAI ? 'var(--blue)'            : 'var(--green)',
        border:     `1px solid ${isAI ? 'rgba(59,130,246,0.25)' : 'rgba(22,163,74,0.25)'}`,
        maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
      {displayLabel}
    </span>
  );
}

function DetailRow({ label, value, mono = false, highlight = false }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{
        fontSize: 13,
        fontFamily: mono ? "'IBM Plex Mono',monospace" : "Inter,sans-serif",
        color:      highlight ? 'var(--blue)' : 'var(--text-1)',
        fontWeight: highlight ? 600 : 400,
      }}>{value}</span>
    </div>
  );
}

function ExpandedDetails({ e, onApprove, onReject, actioning }) {
  const isAI  = !e.submittedByEmail;
  const source = resolveSource(e);

  // Equity display: derive per-year and total grant values separately
  const equityPerYear    = e.equity           != null ? fmt(e.equity)           : null;
  const equityTotalGrant = e.equityTotalGrant != null ? fmt(e.equityTotalGrant) : null;

  // Vesting period label — infer from ratio if both values exist
  const vestingLabel = (() => {
    if (!equityPerYear || !equityTotalGrant || equityTotalGrant === equityPerYear) return null;
    const perYr = e.equity;
    const total = e.equityTotalGrant;
    if (!perYr || !total || perYr === 0) return null;
    const yrs = Math.round(total / perYr);
    return yrs >= 2 && yrs <= 6 ? `${yrs}-yr vesting` : null;
  })();

  return (
    <tr>
      <td colSpan={10} style={{ padding: 0, background: 'transparent' }}>
        <div style={{
          margin: '0 0 2px 0',
          padding: '20px 24px 20px 32px',
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--border)',
          borderLeft: `3px solid ${isAI ? 'rgba(59,130,246,0.5)' : 'rgba(22,163,74,0.4)'}`,
          animation: 'expandIn 0.18s ease',
        }}>
          {/* Detail grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '16px 24px',
            marginBottom: 20,
          }}>
            <DetailRow label="Base Salary"      value={fmt(e.baseSalary)}        highlight mono />
            <DetailRow label="Bonus"             value={fmt(e.bonus)}             mono />
            <DetailRow
              label={vestingLabel ? `Equity / yr  ·  ${vestingLabel}` : 'Equity / yr'}
              value={equityPerYear}
              mono
            />
            {equityTotalGrant && equityTotalGrant !== equityPerYear && (
              <DetailRow label="Total RSU Grant"   value={equityTotalGrant}         mono />
            )}
            <DetailRow label="Total Comp"        value={fmt(e.totalCompensation)} highlight mono />
            <DetailRow label="Department"        value={e.department} />
            <DetailRow label="Experience Level"  value={e.experienceLevel} />
            <DetailRow label="Years of Exp"      value={e.yearsOfExperience != null ? `${e.yearsOfExperience} yrs` : null} />
            <DetailRow label="Employment Type"   value={e.employmentType} />
            <DetailRow label="Level"             value={e.standardizedLevelName ?? e.functionLevelName} />
            <DetailRow label="Job Function"      value={e.jobFunctionName} />
            <DetailRow label="Submitted"         value={fmtDate(e.createdAt)}     mono />
            <DetailRow label="Source"            value={e.submittedByEmail ?? source} />
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => onApprove(e.id)}
              disabled={actioning === e.id}
              style={{
                padding: '6px 18px', fontSize: 12, fontWeight: 600,
                background: 'var(--green-dim)', color: 'var(--green)',
                border: '1px solid rgba(22,163,74,0.25)', borderRadius: 7,
                cursor: actioning === e.id ? 'not-allowed' : 'pointer',
                opacity: actioning === e.id ? 0.65 : 1,
                fontFamily: "Inter,sans-serif",
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'opacity 0.2s ease',
              }}
            >
              {actioning === e.id ? (
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
                fontFamily: "Inter,sans-serif",
                transition: 'opacity 0.2s ease',
              }}
            >
              ✕ Reject
            </button>

            {actioning === e.id && (
              <div style={{ flex: 1, height: 3, background: 'rgba(22,163,74,0.12)', borderRadius: 99, overflow: 'hidden', maxWidth: 160 }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--green), #16a34a)', borderRadius: 99, animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminPendingSalaries() {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(0);
  const [total,    setTotal]    = useState(0);
  const [rejectId, setRejectId] = useState(null);
  const [reason,   setReason]   = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [actioning,  setActioning]  = useState(null);
  const [expanded,   setExpanded]   = useState(null); // id of currently expanded row

  // ── AI Enrichment state ────────────────────────────────────────────────────
  const [enrichCompany, setEnrichCompany] = useState('');
  const [enrichState,   setEnrichState]   = useState('idle'); // idle | submitting | polling | done | failed
  const [enrichResult,  setEnrichResult]  = useState(null);   // { inserted, companyName }
  const [enrichError,   setEnrichError]   = useState(null);
  const [enrichInfo,    setEnrichInfo]    = useState(null);   // { lastEnrichedAt, pendingCount } | null
  const [infoLoading,   setInfoLoading]   = useState(false);
  const pollRef    = useRef(null);
  const infoTimerRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => () => { clearInterval(pollRef.current); clearTimeout(infoTimerRef.current); }, []);

  // ── Salary list ────────────────────────────────────────────────────────────
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

  // ── Actions ────────────────────────────────────────────────────────────────
  async function approve(id) {
    setActioning(id);
    try {
      await api.patch(`/admin/salaries/${id}/approve`);
      setExpanded(null);
      loadSilent();
    }
    catch (e) { console.error(e); }
    finally   { setActioning(null); }
  }

  async function reject(id) {
    setActioning(id);
    try {
      await api.patch(`/admin/salaries/${id}/reject`, { reason });
      setRejectId(null);
      setReason('');
      setExpanded(null);
      loadSilent();
    }
    catch (e) { console.error(e); }
    finally   { setActioning(null); }
  }

  function toggleExpand(id) {
    setExpanded(prev => prev === id ? null : id);
  }

  // ── AI Enrichment ──────────────────────────────────────────────────────────
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
    // Debounce the info fetch by 600ms so we don't fire on every keystroke
    clearTimeout(infoTimerRef.current);
    infoTimerRef.current = setTimeout(() => fetchEnrichInfo(val), 600);
  }

  function stopPolling() {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }

  async function startPolling(jobId) {
    setEnrichState('polling');

    // Safety timeout — if the job is still RUNNING after 90 seconds, stop polling
    // and surface an error rather than spinning forever (e.g. if Claude API hangs).
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
          clearTimeout(timeoutId);
          stopPolling();
          setEnrichResult({ inserted: data.inserted, companyName: data.companyName });
          setEnrichState('done');
          loadSilent();
          fetchEnrichInfo(data.companyName);
        } else if (data?.status === 'FAILED') {
          clearTimeout(timeoutId);
          stopPolling();
          setEnrichError(data.error ?? 'Enrichment failed — check backend logs.');
          setEnrichState('failed');
        }
        // status === 'RUNNING' → keep polling
      } catch (err) {
        clearTimeout(timeoutId);
        stopPolling();
        setEnrichError(`Polling error: ${err.response?.data?.error ?? err.message}`);
        setEnrichState('failed');
      }
    }, 2000);
  }

  async function handleEnrich() {
    if (!enrichCompany.trim() || enrichState === 'submitting' || enrichState === 'polling') return;

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

  const isEnriching = enrichState === 'submitting' || enrichState === 'polling';
  const hasTooManyPending = enrichInfo && enrichInfo.pendingCount > 5;
  const enrichBlocked = isEnriching || hasTooManyPending;

  // ── Render ─────────────────────────────────────────────────────────────────
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
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pending-row {
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .pending-row:hover { background: var(--bg-2) !important; }
        .pending-row.is-expanded { background: var(--bg-3) !important; }
        .expand-chevron {
          display: inline-block;
          transition: transform 0.2s ease;
          color: var(--text-3);
          font-size: 10px;
        }
        .expand-chevron.open { transform: rotate(90deg); }
      `}</style>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <span className="section-tag">Admin</span>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', marginTop: 4, letterSpacing: '-0.02em' }}>
          Pending Salaries <span style={{ fontSize: 18, color: 'var(--text-3)' }}>({total})</span>
        </h2>
      </div>

      {/* ── AI Enrichment panel ──────────────────────────────────────────── */}
      <div style={{
        marginBottom: 28, padding: '20px 24px', borderRadius: 14,
        background: 'var(--blue-dim)',
        border: '1px solid var(--blue-mid)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>✦</span>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: 'var(--blue)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI Enrichment</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
          Enter a company name. Claude will search the web for real salary data and queue up to 20 entries for your review.
          <span
            title="Claude searches levels.fyi first, then glassdoor and ambitionbox if needed (max 3 searches). Each entry is tagged with its own source. All results land as PENDING — nothing goes live until you approve."
            style={{ marginLeft: 6, cursor: 'help', color: 'var(--blue)', fontSize: 12, fontFamily: "'IBM Plex Mono',monospace" }}
          >
            ⓘ how it works
          </span>
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Google, Flipkart, Zepto…"
            value={enrichCompany}
            onChange={e => handleCompanyChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !enrichBlocked) handleEnrich(); }}
            disabled={enrichBlocked}
            style={{ flex: '1 1 260px', minWidth: 0, opacity: enrichBlocked ? 0.6 : 1 }}
          />
          <button
            onClick={handleEnrich}
            disabled={enrichBlocked || !enrichCompany.trim()}
            title={hasTooManyPending ? `Review the ${enrichInfo.pendingCount} pending entries for this company before enriching again` : undefined}
            style={{
              padding: '9px 22px', fontSize: 13, fontWeight: 600,
              fontFamily: "Inter,sans-serif",
              background: enrichBlocked ? 'var(--blue-dim)' : 'rgba(59,130,246,0.12)',
              color: 'var(--blue)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 9,
              cursor: enrichBlocked || !enrichCompany.trim() ? 'not-allowed' : 'pointer',
              opacity: enrichBlocked || !enrichCompany.trim() ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s ease',
            }}
          >
            {isEnriching ? (
              <>
                <div style={{
                  width: 13, height: 13, borderRadius: '50%',
                  border: '2px solid rgba(59,130,246,0.25)',
                  borderTopColor: 'var(--blue)',
                  animation: 'spin 0.8s linear infinite', flexShrink: 0,
                }} />
                {enrichState === 'submitting' ? 'Starting…' : 'Enriching…'}
              </>
            ) : hasTooManyPending ? '⛔ Review pending first' : '✦ Enrich with AI'}
          </button>
        </div>

        {/* Info strip — last enriched + pending count */}
        {(infoLoading || enrichInfo) && !isEnriching && enrichState === 'idle' && (
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 16,
            fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
            color: 'var(--text-3)',
          }}>
            {infoLoading ? (
              <span style={{ opacity: 0.6 }}>checking…</span>
            ) : enrichInfo && (
              <>
                <span title="When this company was last enriched via Claude">
                  🕐 {enrichInfo.lastEnrichedAt
                    ? `Last enriched ${formatRelativeTime(enrichInfo.lastEnrichedAt)}`
                    : 'Never enriched'}
                </span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span
                  title={enrichInfo.pendingCount > 0
                    ? 'Review and action these entries before enriching again to avoid duplicate data'
                    : 'No pending entries — safe to enrich'}
                  style={{ color: enrichInfo.pendingCount > 5 ? 'var(--rose)' : enrichInfo.pendingCount > 0 ? 'rgba(245,158,11,0.9)' : 'var(--text-3)' }}
                >
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

        {/* Progress hint */}
        {isEnriching && (
          <p style={{
            marginTop: 12, fontSize: 12,
            color: 'rgba(59,130,246,0.7)',
            fontFamily: "'IBM Plex Mono',monospace",
            animation: 'enrichPulse 1.8s ease-in-out infinite',
          }}>
            {enrichState === 'submitting'
              ? 'Queuing enrichment job…'
              : 'Claude is searching the web and structuring salary data… this takes 15–45 seconds.'}
          </p>
        )}

        {/* Success */}
        {enrichState === 'done' && enrichResult && (
          <div style={{
            marginTop: 14, display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            background: 'var(--green-dim)',
            border: '1px solid rgba(22,163,74,0.25)',
            borderRadius: 9,
          }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <span style={{ fontSize: 13, color: 'var(--green)' }}>
              <strong>{enrichResult.inserted}</strong> {enrichResult.inserted === 1 ? 'entry' : 'entries'} queued for{' '}
              <strong>{enrichResult.companyName}</strong> — review them in the table below.
            </span>
          </div>
        )}

        {/* Error */}
        {enrichState === 'failed' && enrichError && (
          <div style={{
            marginTop: 14, padding: '10px 16px',
            background: 'var(--rose-dim)',
            border: '0.5px solid rgba(224,92,122,0.25)',
            borderRadius: 9, fontSize: 13, color: 'var(--rose)',
          }}>
            {enrichError}
          </div>
        )}
      </div>

      {/* ── Warning banner ───────────────────────────────────────────────── */}
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
          </span>
        </div>
      )}

      {/* ── Pending table ────────────────────────────────────────────────── */}
      {!loading && entries.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, fontFamily: "'IBM Plex Mono',monospace" }}>
          ↓ Click any row to expand full details
        </p>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>Loading…</div>
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
                  <th style={{ width: 24 }}></th>
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
                {entries.map(e => {
                  const isOpen = expanded === e.id;
                  return (
                    <>
                      <tr
                        key={e.id}
                        className={`pending-row${isOpen ? ' is-expanded' : ''}`}
                        onClick={() => toggleExpand(e.id)}
                      >
                        <td style={{ textAlign: 'center', paddingRight: 0 }}>
                          <span className={`expand-chevron${isOpen ? ' open' : ''}`}>▶</span>
                        </td>
                        <td><div className="company-name">{e.companyName ?? e.company?.name}</div></td>
                        <td>{e.jobTitle}</td>
                        <td>{e.location}</td>
                        <td><div className="salary-amount" style={{ fontSize: 15 }}>{fmt(e.baseSalary)}</div></td>
                        <td style={{ color: e.bonus ? 'var(--text-1)' : 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{fmt(e.bonus)}</td>
                        <td style={{ color: e.equity ? 'var(--text-1)' : 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{fmt(e.equity)}</td>
                        <td><div className="salary-amount" style={{ fontSize: 15 }}>{fmt(e.totalCompensation)}</div></td>
                        <td><SourceBadge entry={e} /></td>
                        <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(e.createdAt)}</td>
                      </tr>
                      {isOpen && (
                        <ExpandedDetails
                          key={`${e.id}-detail`}
                          e={e}
                          onApprove={approve}
                          onReject={(id) => setRejectId(id)}
                          actioning={actioning}
                        />
                      )}
                    </>
                  );
                })}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setRejectId(null)}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, padding: 36, width: 440, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Reject Entry</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 20 }}>Provide a reason (optional — will be logged in audit trail).</p>
            <textarea
              className="form-input" rows={3}
              placeholder="Reason for rejection…"
              value={reason} onChange={e => setReason(e.target.value)}
              style={{ resize: 'vertical', width: '100%', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-ghost" onClick={() => setRejectId(null)}>Cancel</button>
              <button onClick={() => reject(rejectId)} style={{ padding: '9px 22px', fontSize: 13, fontWeight: 600, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.3)', borderRadius: 8, cursor: 'pointer', fontFamily: "Inter,sans-serif" }}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

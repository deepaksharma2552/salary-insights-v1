import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const RANGES = [
  { label: 'Last 7 days',  days: 7  },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1)    + 'K';
  return String(n);
}

function dateRange(days) {
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  const f = d => d.toISOString().split('T')[0];
  return { from: f(from), to: f(to) };
}

export default function AdminAnalytics() {
  const [rangeIdx,    setRangeIdx]    = useState(1);
  const [pageStats,   setPageStats]   = useState([]);
  const [dailyStats,  setDailyStats]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [aggregating, setAggregating] = useState(false);
  const [aggMsg,      setAggMsg]      = useState(null); // { ok: bool, text: string }

  const fetchData = useCallback((idx) => {
    const { from, to } = dateRange(RANGES[idx].days);
    return Promise.all([
      api.get('/admin/analytics/pages', { params: { from, to } }),
      api.get('/admin/analytics/daily', { params: { from, to } }),
    ]).then(([pRes, dRes]) => {
      setPageStats(pRes.data?.data  ?? []);
      setDailyStats(dRes.data?.data ?? []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData(rangeIdx)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [rangeIdx, fetchData]);

  function triggerAggregation() {
    setAggregating(true);
    setAggMsg(null);
    api.post('/admin/analytics/aggregate')
      .then(() => {
        setAggMsg({ ok: true, text: 'Aggregation complete — data refreshed.' });
        return fetchData(rangeIdx);
      })
      .catch(() => setAggMsg({ ok: false, text: 'Aggregation failed — check server logs.' }))
      .finally(() => setAggregating(false));
  }

  const totalViews   = dailyStats.reduce((s, d) => s + Number(d.views),          0);
  const totalUnique  = dailyStats.reduce((s, d) => s + Number(d.uniqueSessions), 0);
  const maxDayViews  = Math.max(...dailyStats.map(d => Number(d.views)), 1);
  const maxPageViews = Math.max(...pageStats.map(p => Number(p.views)),  1);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aggMsg ? 12 : 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 4 }}>
            Admin
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Visitor Analytics
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Manual aggregation trigger */}
          <button
            onClick={triggerAggregation}
            disabled={aggregating || loading}
            title="Flush raw events into the daily stats table — normally runs hourly automatically"
            style={{
              fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 8,
              cursor: aggregating || loading ? 'not-allowed' : 'pointer',
              border: '0.5px solid var(--border)',
              background: 'var(--bg-2)',
              color: aggregating ? 'var(--text-3)' : 'var(--text-2)',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: aggregating || loading ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {aggregating
              ? <><span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid var(--border)', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> Aggregating…</>
              : '⚡ Run aggregation'
            }
          </button>

          {/* Range selector */}
          <div style={{ display: 'flex', gap: 6 }}>
            {RANGES.map((r, i) => (
              <button key={i} onClick={() => setRangeIdx(i)} style={{
                fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                border: i === rangeIdx ? 'none' : '0.5px solid var(--border)',
                background: i === rangeIdx ? '#1d4ed8' : 'var(--bg-2)',
                color: i === rangeIdx ? '#fff' : 'var(--text-2)',
              }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Aggregation result banner */}
      {aggMsg && (
        <div style={{
          marginBottom: 20, padding: '10px 16px', borderRadius: 8, fontSize: 12,
          background: aggMsg.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `0.5px solid ${aggMsg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: aggMsg.ok ? '#059669' : '#dc2626',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{aggMsg.ok ? '✓' : '✕'} {aggMsg.text}</span>
          <button onClick={() => setAggMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 14, flexDirection: 'column' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--border)', borderTopColor: '#3b82f6', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>Loading analytics…</span>
        </div>
      ) : (
        <>
          {/* Summary stat chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Total Page Views', value: fmt(totalViews),  sub: RANGES[rangeIdx].label },
              { label: 'Unique Visitors',  value: fmt(totalUnique), sub: 'estimated via session hash' },
              { label: 'Pages Tracked',    value: pageStats.length, sub: 'distinct routes' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Daily trend chart */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 16 }}>Daily page views</div>
            {dailyStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 13, fontStyle: 'italic' }}>
                No data yet — click "Run aggregation" to process pending events
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, overflowX: 'auto' }}>
                {dailyStats.map((d, i) => {
                  const pct = Math.round((Number(d.views) / maxDayViews) * 100);
                  return (
                    <div key={i} title={`${d.date}: ${d.views} views`}
                      style={{ flex: '1 0 8px', maxWidth: 20, minWidth: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '100%', height: `${Math.max(pct, 2)}%`, background: '#3b82f6', borderRadius: '2px 2px 0 0', opacity: 0.8, transition: 'height 0.2s' }} />
                    </div>
                  );
                })}
              </div>
            )}
            {dailyStats.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>{dailyStats[0]?.date}</span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>{dailyStats[dailyStats.length - 1]?.date}</span>
              </div>
            )}
          </div>

          {/* Top pages table */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              Top pages
            </div>
            {pageStats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13, fontStyle: 'italic' }}>
                No data yet — click "Run aggregation" to process pending events
              </div>
            ) : (
              <div className="table-scroll-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Page', 'Views', 'Unique visitors', '% of total'].map(h => (
                        <th key={h} style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', padding: '10px 24px', textAlign: h === 'Page' ? 'left' : 'right', borderBottom: '0.5px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageStats.map((p, i) => {
                      const barPct   = Math.round((Number(p.views) / maxPageViews) * 100);
                      const totalPct = totalViews > 0 ? ((Number(p.views) / totalViews) * 100).toFixed(1) : '0';
                      return (
                        <tr key={i} style={{ borderBottom: i < pageStats.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                          <td style={{ padding: '10px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, height: 4, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden', maxWidth: 120 }}>
                                <div style={{ height: '100%', width: `${barPct}%`, background: '#3b82f6', borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 12, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>{p.page}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 24px', textAlign: 'right', fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text-1)' }}>{fmt(Number(p.views))}</td>
                          <td style={{ padding: '10px 24px', textAlign: 'right', fontSize: 12, color: 'var(--text-2)', fontFamily: "'IBM Plex Mono',monospace" }}>{fmt(Number(p.uniqueSessions))}</td>
                          <td style={{ padding: '10px 24px', textAlign: 'right', fontSize: 12, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>{totalPct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
            Data updates hourly · No PII stored · Session = SHA-256(IP + UA + date)
          </div>
        </>
      )}
    </div>
  );
}

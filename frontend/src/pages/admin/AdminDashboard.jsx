import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';

/* ─────────────────────────────────────────────────────────────────────────────
   ProgressBar — shared inline loading indicator
───────────────────────────────────────────────────────────────────────────── */
function ProgressBar() {
  return (
    <div style={{ padding: '28px 0 24px' }}>
      <div style={{ width: '100%', height: 2, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg,#38bdf8,#3b82f6)',
          borderRadius: 99,
          animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards',
        }} />
      </div>
      <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   StatMiniBar — horizontal bar for the salary breakdown mini-chart
───────────────────────────────────────────────────────────────────────────── */
function StatMiniBar({ label, value, pct, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)', minWidth: 80 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'var(--bg-3)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text-2)', minWidth: 52, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TopCompanyRow — one row in the top companies mini-list
───────────────────────────────────────────────────────────────────────────── */
function TopCompanyRow({ initial, name, count, maxCount, color }) {
  const pct = Math.round((count / maxCount) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        background: `${color}18`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace",
      }}>
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
        </div>
      </div>
      <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text-2)', flexShrink: 0 }}>{count}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SubmissionTrend — bar chart with monthly / weekly drill-down
───────────────────────────────────────────────────────────────────────────── */
function SubmissionTrend({ monthlyData }) {
  const [mode,        setMode]        = useState('monthly');
  const [activeMonth, setActiveMonth] = useState(null);
  const [weeklyData,  setWeeklyData]  = useState(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError,   setWeekError]   = useState(null);
  const [tooltip,     setTooltip]     = useState(null);
  const chartRef = useRef(null);

  const months = (monthlyData ?? []).map(row => {
    const d = new Date(row.month);
    return {
      year:  d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      full:  d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      count: Number(row.count) || 0,
    };
  });

  const fetchWeekly = useCallback((year, month) => {
    setWeekLoading(true);
    setWeekError(null);
    setWeeklyData(null);
    api.get('/admin/salaries/dashboard', { params: { year, month } })
      .then(r => {
        const data = r.data?.data ?? r.data;
        setWeeklyData(data?.weeklyTrend ?? []);
      })
      .catch(err => setWeekError(err.response?.data?.message ?? err.message))
      .finally(() => setWeekLoading(false));
  }, []);

  function drillInto(m) {
    setActiveMonth(m);
    setMode('weekly');
    fetchWeekly(m.year, m.month);
  }

  function navigateMonth(dir) {
    if (!activeMonth || months.length === 0) return;
    const idx  = months.findIndex(m => m.year === activeMonth.year && m.month === activeMonth.month);
    const next = months[idx + dir];
    if (next) drillInto(next);
  }

  const activeIdx = activeMonth
    ? months.findIndex(m => m.year === activeMonth.year && m.month === activeMonth.month)
    : -1;
  const canGoPrev = activeIdx > 0;
  const canGoNext = activeIdx < months.length - 1;

  function BarChart({ rows, labelKey, countKey, color, onBarClick, clickable }) {
    const max   = Math.max(...rows.map(r => Number(r[countKey]) || 0), 1);
    const BAR_H = 110;

    return (
      <div
        ref={chartRef}
        style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 5, height: BAR_H + 34, marginTop: 8 }}
      >
        {rows.map((row, i) => {
          const count = Number(row[countKey]) || 0;
          const barH  = Math.round(Math.max((count / max), count > 0 ? 0.04 : 0) * BAR_H);

          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: clickable ? 'pointer' : 'default', position: 'relative' }}
              onClick={() => clickable && onBarClick?.(row)}
              onMouseEnter={e => {
                const rect   = e.currentTarget.getBoundingClientRect();
                const parent = chartRef.current?.getBoundingClientRect();
                setTooltip({
                  x:    rect.left - (parent?.left ?? 0) + rect.width / 2,
                  text: `${row[labelKey]}: ${count} submission${count !== 1 ? 's' : ''}`,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Count label */}
              <span style={{ fontSize: 9, color: count > 0 ? 'var(--text-3)' : 'transparent', fontFamily: "'IBM Plex Mono',monospace", marginBottom: 3, userSelect: 'none' }}>
                {count > 0 ? count : ''}
              </span>

              {/* Bar */}
              <div
                style={{ width: '100%', height: barH || 2, background: count > 0 ? color : 'var(--bg-3)', borderRadius: '3px 3px 0 0', transition: 'height 0.35s ease, opacity 0.15s' }}
                onMouseEnter={e => { if (clickable && count > 0) e.currentTarget.style.opacity = '0.75'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              />

              {/* Label */}
              <span style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 5, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', userSelect: 'none' }}>
                {row[labelKey]}
              </span>
            </div>
          );
        })}

        {tooltip && (
          <div style={{
            position: 'absolute', bottom: BAR_H + 40, left: tooltip.x, transform: 'translateX(-50%)',
            background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-1)',
            whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.14)', pointerEvents: 'none', zIndex: 10,
          }}>
            {tooltip.text}
          </div>
        )}
      </div>
    );
  }

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div style={{ padding: '24px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
        No submission trend data yet.
      </div>
    );
  }

  return (
    <div className="chart-card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div className="chart-title">Submission Trend</div>
          <div className="chart-subtitle">
            {mode === 'monthly'
              ? 'Last 12 months — click any bar to see weekly breakdown'
              : `Weekly breakdown — ${activeMonth?.full}`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {mode === 'weekly' && (
            <>
              <button
                onClick={() => { setMode('monthly'); setActiveMonth(null); setWeeklyData(null); }}
                style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}
              >
                ← Monthly
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <button
                  onClick={() => navigateMonth(-1)} disabled={!canGoPrev}
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: canGoPrev ? 'var(--text-2)' : 'var(--text-4)', cursor: canGoPrev ? 'pointer' : 'not-allowed', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >‹</button>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', minWidth: 60, textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace" }}>
                  {activeMonth?.label}
                </span>
                <button
                  onClick={() => navigateMonth(1)} disabled={!canGoNext}
                  style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: canGoNext ? 'var(--text-2)' : 'var(--text-4)', cursor: canGoNext ? 'pointer' : 'not-allowed', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >›</button>
              </div>
            </>
          )}

          {mode === 'monthly' && (
            <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
              {['Monthly', 'Weekly'].map(m => (
                <button
                  key={m}
                  onClick={() => {
                    if (m === 'Weekly') {
                      const latest = [...months].reverse().find(mo => mo.count > 0) ?? months[months.length - 1];
                      if (latest) drillInto(latest);
                    }
                  }}
                  style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                    background: mode.toLowerCase() === m.toLowerCase() ? 'var(--panel)' : 'transparent',
                    color:      mode.toLowerCase() === m.toLowerCase() ? 'var(--text-1)' : 'var(--text-3)',
                    boxShadow:  mode.toLowerCase() === m.toLowerCase() ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly chart */}
      {mode === 'monthly' && (
        <BarChart
          rows={months}
          labelKey="label"
          countKey="count"
          color="linear-gradient(180deg,#3b82f6,rgba(59,130,246,0.3))"
          clickable
          onBarClick={row => drillInto(row)}
        />
      )}

      {/* Weekly chart */}
      {mode === 'weekly' && (
        weekLoading ? (
          <ProgressBar />
        ) : weekError ? (
          <div style={{ padding: '14px 16px', color: 'var(--rose)', fontSize: 13, background: 'var(--rose-dim)', borderRadius: 10 }}>
            Failed to load weekly data: {weekError}
          </div>
        ) : weeklyData && weeklyData.length > 0 ? (
          <>
            <BarChart
              rows={weeklyData}
              labelKey="weekLabel"
              countKey="count"
              color="linear-gradient(180deg,#8b5cf6,rgba(139,92,246,0.3))"
              clickable={false}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {weeklyData.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-2)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: '#8b5cf6', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: "'IBM Plex Mono',monospace" }}>
                    Week {w.weekNum}: <strong style={{ color: 'var(--text-1)' }}>{w.count}</strong> submission{Number(w.count) !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{w.weekLabel}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>
            No submissions in {activeMonth?.full}.
          </div>
        )
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AdminDashboard
───────────────────────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/admin/salaries/dashboard')
      .then(r => setStats(r.data?.data ?? r.data))
      .catch(err => {
        const status = err.response?.status;
        const msg    = err.response?.data?.message ?? err.message ?? 'Unknown error';
        setError(`${status ?? 'Network error'}: ${msg}`);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = val => {
    if (val === null || val === undefined) return '—';
    const n = Number(val);
    if (isNaN(n) || n === 0) return n === 0 ? '₹0' : '—';
    const l = n / 100000;
    return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
  };

  // ── KPI definitions ───────────────────────────────────────────────────────
  const kpis = stats ? [
    {
      label: 'Total Entries',
      value: (stats.totalSalaryEntries ?? 0).toLocaleString('en-IN'),
      icon: '📊',
      accent: 'var(--teal)',
      accentBg: 'rgba(2,132,199,0.08)',
    },
    {
      label: 'Pending Review',
      value: (stats.pendingReviews ?? 0).toLocaleString('en-IN'),
      icon: '⏳',
      accent: 'var(--orange)',
      accentBg: 'var(--orange-dim)',
      highlight: (stats.pendingReviews ?? 0) > 0,
    },
    {
      label: 'Approved',
      value: (stats.approvedEntries ?? 0).toLocaleString('en-IN'),
      icon: '✓',
      accent: 'var(--green)',
      accentBg: 'var(--green-dim)',
    },
    {
      label: 'Rejected',
      value: (stats.rejectedEntries ?? 0).toLocaleString('en-IN'),
      icon: '✕',
      accent: 'var(--rose)',
      accentBg: 'var(--rose-dim)',
    },
    {
      label: 'Total Companies',
      value: (stats.totalCompanies ?? 0).toLocaleString('en-IN'),
      icon: '🏢',
      accent: 'var(--teal)',
      accentBg: 'rgba(2,132,199,0.08)',
    },
    {
      label: 'Active Companies',
      value: (stats.activeCompanies ?? 0).toLocaleString('en-IN'),
      icon: '✅',
      accent: 'var(--green)',
      accentBg: 'var(--green-dim)',
    },
    {
      label: 'Median Base Salary',
      value: fmt(stats.avgBaseSalary),
      icon: '💰',
      accent: 'var(--blue)',
      accentBg: 'var(--blue-dim)',
    },
  ] : [];

  // Approval rate for secondary stat panel
  const approvalRate = stats
    ? stats.approvedEntries && stats.totalSalaryEntries
      ? Math.round((stats.approvedEntries / stats.totalSalaryEntries) * 100)
      : 0
    : null;

  return (
    <div className="admin-page-content">

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <span className="section-tag">Admin</span>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginTop: 4, letterSpacing: '-0.02em' }}>
            Dashboard
          </h2>
        </div>
        {!loading && (
          <button
            onClick={load}
            style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            ↻ Refresh
          </button>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && <ProgressBar />}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(225,29,72,0.18)', borderRadius: 'var(--radius-lg)', color: 'var(--rose)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Failed to load dashboard</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, opacity: 0.85 }}>{error}</div>
          </div>
          <button
            onClick={load}
            style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(225,29,72,0.12)', color: 'var(--rose)', border: '1px solid rgba(225,29,72,0.25)', borderRadius: 6, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPIs ── */}
      {!loading && !error && stats && (
        <>
          {/* KPI Grid */}
          <div className="dashboard-grid" style={{ marginBottom: 16 }}>
            {kpis.map(k => (
              <div
                key={k.label}
                className="kpi-card"
                style={{ borderTop: k.highlight ? `2px solid ${k.accent}` : '1px solid var(--border)' }}
              >
                {/* Icon pill */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8,
                  background: k.accentBg, color: k.accent,
                  fontSize: 15, marginBottom: 12,
                }}>
                  {k.icon}
                </div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value" style={{ color: k.highlight ? k.accent : 'var(--text-1)' }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Secondary row: Approval rate + Top companies ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

            {/* Approval rate card */}
            <div className="chart-card" style={{ marginBottom: 0 }}>
              <div className="chart-title" style={{ marginBottom: 16 }}>Entry Funnel</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <StatMiniBar
                  label="Total submitted"
                  value={(stats.totalSalaryEntries ?? 0).toLocaleString('en-IN')}
                  pct={100}
                  color="var(--blue)"
                />
                <StatMiniBar
                  label="Approved"
                  value={(stats.approvedEntries ?? 0).toLocaleString('en-IN')}
                  pct={approvalRate ?? 0}
                  color="var(--green)"
                />
                <StatMiniBar
                  label="Pending"
                  value={(stats.pendingReviews ?? 0).toLocaleString('en-IN')}
                  pct={stats.totalSalaryEntries ? Math.round((stats.pendingReviews / stats.totalSalaryEntries) * 100) : 0}
                  color="var(--orange)"
                />
                <StatMiniBar
                  label="Rejected"
                  value={(stats.rejectedEntries ?? 0).toLocaleString('en-IN')}
                  pct={stats.totalSalaryEntries ? Math.round((stats.rejectedEntries / stats.totalSalaryEntries) * 100) : 0}
                  color="var(--rose)"
                />
              </div>
              {approvalRate !== null && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--green-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, color: 'var(--green)' }}>{approvalRate}%</span>
                  <span style={{ fontSize: 12, color: 'var(--green)', opacity: 0.85 }}>overall approval rate</span>
                </div>
              )}
            </div>

            {/* Top companies by median salary (placeholder — real data would come from API) */}
            <div className="chart-card" style={{ marginBottom: 0 }}>
              <div className="chart-title" style={{ marginBottom: 16 }}>Company Overview</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <TopCompanyRow initial="G" name="Google India"   count={214} maxCount={214} color="#3b82f6" />
                <TopCompanyRow initial="M" name="Microsoft India" count={178} maxCount={214} color="#8b5cf6" />
                <TopCompanyRow initial="A" name="Amazon India"    count={147} maxCount={214} color="#06b6d4" />
                <TopCompanyRow initial="F" name="Flipkart"        count={112} maxCount={214} color="#6366f1" />
                <TopCompanyRow initial="S" name="Swiggy"          count={98}  maxCount={214} color="#a78bfa" />
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {(stats.totalCompanies ?? 0).toLocaleString('en-IN')} companies total
                </span>
                <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 600 }}>
                  {(stats.activeCompanies ?? 0).toLocaleString('en-IN')} active
                </span>
              </div>
            </div>
          </div>

          {/* ── Submission Trend ── */}
          <SubmissionTrend monthlyData={stats.submissionTrend} />
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && !stats && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-3)', fontSize: 13 }}>
          No dashboard data returned.
          <br />
          <button
            onClick={load}
            style={{ marginTop: 16, padding: '8px 20px', fontSize: 13, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      )}

    </div>
  );
}

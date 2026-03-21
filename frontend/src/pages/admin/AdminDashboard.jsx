import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';

/* ─────────────────────────────────────────────────────────────────────────────
   SubmissionTrend
   Self-contained chart component with Monthly / Weekly mode + month navigator.
   Monthly → click a bar to drill into that month's weekly breakdown.
   Weekly  → "← Monthly" back link + prev/next month navigator.
───────────────────────────────────────────────────────────────────────────── */
function SubmissionTrend({ monthlyData }) {
  // mode: 'monthly' | 'weekly'
  const [mode,        setMode]        = useState('monthly');
  const [activeMonth, setActiveMonth] = useState(null); // { year, month, label }
  const [weeklyData,  setWeeklyData]  = useState(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError,   setWeekError]   = useState(null);
  const [tooltip,     setTooltip]     = useState(null); // { x, y, text }
  const chartRef = useRef(null);

  // ── Derive month list from the 12-month data for navigator ────────────────
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

  // ── Fetch weekly data for a month ─────────────────────────────────────────
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

  // ── Drill into a month ────────────────────────────────────────────────────
  function drillInto(m) {
    setActiveMonth(m);
    setMode('weekly');
    fetchWeekly(m.year, m.month);
  }

  // ── Navigate months ───────────────────────────────────────────────────────
  function navigateMonth(dir) {
    if (!activeMonth || months.length === 0) return;
    const idx = months.findIndex(m => m.year === activeMonth.year && m.month === activeMonth.month);
    const next = months[idx + dir];
    if (next) drillInto(next);
  }

  const activeIdx   = activeMonth
    ? months.findIndex(m => m.year === activeMonth.year && m.month === activeMonth.month)
    : -1;
  const canGoPrev   = activeIdx > 0;
  const canGoNext   = activeIdx < months.length - 1;

  // ── Bar chart renderer ────────────────────────────────────────────────────
  function BarChart({ rows, labelKey, countKey, color, onBarClick, clickable }) {
    const max    = Math.max(...rows.map(r => Number(r[countKey]) || 0), 1);
    const BAR_H  = 120;

    return (
      <div ref={chartRef} style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 6, height: BAR_H + 36, marginTop: 8 }}>
        {rows.map((row, i) => {
          const count = Number(row[countKey]) || 0;
          const pct   = Math.max(Math.round((count / max) * 100), count > 0 ? 4 : 0);
          const barH  = Math.round((pct / 100) * BAR_H);
          const isActive = clickable;

          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, cursor: isActive ? 'pointer' : 'default', position: 'relative' }}
              onClick={() => isActive && onBarClick && onBarClick(row)}
              onMouseEnter={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const parent = chartRef.current?.getBoundingClientRect();
                setTooltip({
                  x: rect.left - (parent?.left ?? 0) + rect.width / 2,
                  text: `${row[labelKey]}: ${count} submission${count !== 1 ? 's' : ''}`,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Count label above bar */}
              <span style={{
                fontSize: 9, color: count > 0 ? 'var(--text-3)' : 'transparent',
                fontFamily: "'JetBrains Mono',monospace", marginBottom: 3, userSelect: 'none',
              }}>
                {count > 0 ? count : ''}
              </span>

              {/* Bar */}
              <div style={{
                width: '100%',
                height: barH || 2,
                background: count > 0 ? color : 'var(--bg-3)',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.3s ease, opacity 0.15s',
                opacity: 1,
              }}
                onMouseEnter={e => { if (isActive && count > 0) e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              />

              {/* X-axis label */}
              <span style={{
                fontSize: 9, color: 'var(--text-3)', marginTop: 5,
                fontFamily: "'JetBrains Mono',monospace",
                whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis', maxWidth: '100%', userSelect: 'none',
              }}>
                {row[labelKey]}
              </span>
            </div>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute', bottom: BAR_H + 42,
            left: tooltip.x, transform: 'translateX(-50%)',
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '5px 10px',
            fontSize: 11, fontWeight: 600, color: 'var(--text-1)',
            whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            pointerEvents: 'none', zIndex: 10,
          }}>
            {tooltip.text}
          </div>
        )}
      </div>
    );
  }

  // ── Empty monthly data ────────────────────────────────────────────────────
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div style={{ marginTop: 32, padding: '24px 28px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
        No submission trend data yet — salaries will appear here once entries are submitted.
      </div>
    );
  }

  return (
    <div className="chart-card" style={{ marginTop: 32 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div className="chart-title">Submission Trend</div>
          <div className="chart-subtitle">
            {mode === 'monthly'
              ? 'Last 12 months — click any bar to see weekly breakdown'
              : `Weekly breakdown — ${activeMonth?.full}`}
          </div>
        </div>

        {/* Mode toggle + month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Back to monthly */}
          {mode === 'weekly' && (
            <button
              onClick={() => { setMode('monthly'); setActiveMonth(null); setWeeklyData(null); }}
              style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              ← Monthly
            </button>
          )}

          {/* Month prev/next (only in weekly mode) */}
          {mode === 'weekly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => navigateMonth(-1)}
                disabled={!canGoPrev}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: canGoPrev ? 'var(--text-2)' : 'var(--text-4)', cursor: canGoPrev ? 'pointer' : 'not-allowed', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >‹</button>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', minWidth: 64, textAlign: 'center', fontFamily: "'JetBrains Mono',monospace" }}>
                {activeMonth?.label}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                disabled={!canGoNext}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: canGoNext ? 'var(--text-2)' : 'var(--text-4)', cursor: canGoNext ? 'pointer' : 'not-allowed', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >›</button>
            </div>
          )}

          {/* Mode pills (monthly view only) */}
          {mode === 'monthly' && (
            <div style={{ display: 'flex', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
              {['Monthly', 'Weekly'].map(m => (
                <button
                  key={m}
                  onClick={() => {
                    if (m === 'Weekly') {
                      // Auto-drill into most recent month with data
                      const latest = [...months].reverse().find(mo => mo.count > 0) ?? months[months.length - 1];
                      if (latest) drillInto(latest);
                    }
                  }}
                  style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                    background: mode.toLowerCase() === m.toLowerCase() ? 'var(--panel)' : 'transparent',
                    color:      mode.toLowerCase() === m.toLowerCase() ? 'var(--text-1)' : 'var(--text-3)',
                    boxShadow:  mode.toLowerCase() === m.toLowerCase() ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Monthly bar chart ── */}
      {mode === 'monthly' && (
        <BarChart
          rows={months}
          labelKey="label"
          countKey="count"
          color="linear-gradient(180deg,#3b82f6,rgba(59,130,246,0.35))"
          clickable
          onBarClick={row => drillInto(row)}
        />
      )}

      {/* ── Weekly bar chart ── */}
      {mode === 'weekly' && (
        weekLoading ? (
          <div style={{ padding: '24px 0 20px' }}>
            <div style={{ width: '100%', height: 3, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius: 99, animation: 'progressCrawl 1.5s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
            </div>
            <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
          </div>
        ) : weekError ? (
          <div style={{ padding: '16px', color: 'var(--rose)', fontSize: 13, background: 'var(--rose-dim)', borderRadius: 10 }}>
            Failed to load weekly data: {weekError}
          </div>
        ) : weeklyData && weeklyData.length > 0 ? (
          <>
            <BarChart
              rows={weeklyData}
              labelKey="weekLabel"
              countKey="count"
              color="linear-gradient(180deg,#8b5cf6,rgba(139,92,246,0.35))"
              clickable={false}
            />
            {/* Week detail legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {weeklyData.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-2)', borderRadius: 7, border: '1px solid var(--border)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: '#8b5cf6', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: "'JetBrains Mono',monospace" }}>
                    Week {w.weekNum}: <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{w.count}</span> submission{Number(w.count) !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 2 }}>{w.weekLabel}</span>
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

  const kpis = stats ? [
    { label: 'Total Entries',    value: stats.totalSalaryEntries ?? 0, icon: '📊', cls: 'kpi-icon-teal' },
    { label: 'Pending Review',   value: stats.pendingReviews     ?? 0, icon: '⏳', cls: 'kpi-icon-gold' },
    { label: 'Approved',         value: stats.approvedEntries    ?? 0, icon: '✓',  cls: 'kpi-icon-teal' },
    { label: 'Rejected',         value: stats.rejectedEntries    ?? 0, icon: '✕',  cls: 'kpi-icon-gold' },
    { label: 'Total Companies',  value: stats.totalCompanies     ?? 0, icon: '🏢', cls: 'kpi-icon-teal' },
    { label: 'Active Companies', value: stats.activeCompanies    ?? 0, icon: '✅', cls: 'kpi-icon-gold' },
    { label: 'Avg Base Salary',  value: fmt(stats.avgBaseSalary),      icon: '💰', cls: 'kpi-icon-gold' },
  ] : [];

  return (
    <div style={{ padding: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>Dashboard</h2>
        </div>
        {!loading && (
          <button onClick={load} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
            ↻ Refresh
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: '32px 0 30px' }}>
          <div style={{ width: '100%', height: 3, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius: 99, animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
          </div>
          <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ padding: '16px 20px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 12, color: 'var(--rose)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Failed to load dashboard</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, opacity: 0.85 }}>{error}</div>
          </div>
          <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(224,92,122,0.15)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.3)', borderRadius: 6, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* KPIs + Trend */}
      {!loading && !error && stats && (
        <>
          <div className="dashboard-grid">
            {kpis.map(k => (
              <div key={k.label} className="kpi-card">
                <div className={`kpi-icon ${k.cls}`} style={{ fontSize: 18 }}>{k.icon}</div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value" style={{ fontSize: 28 }}>{k.value}</div>
              </div>
            ))}
          </div>
          <SubmissionTrend monthlyData={stats.submissionTrend} />
        </>
      )}

      {/* No stats at all */}
      {!loading && !error && !stats && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontSize: 13 }}>
          No dashboard data returned.
          <br/>
          <button onClick={load} style={{ marginTop: 16, padding: '8px 20px', fontSize: 13, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Try again</button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import { AuthContext } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { mapSalary } from '../../utils/salaryMapper';

function fmtCount(n) {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k+';
  return n.toLocaleString('en-IN');
}

/* ── JourneyCard — desktop only (unchanged) ─────────────────────────────── */
function JourneyCard({ emoji, title, desc, stats, actions, amber, featured, green, purple }) {
  return (
    <div style={{
      background: amber ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : featured ? 'linear-gradient(135deg,#f0f9ff,#e0f2fe)' : 'var(--panel)',
      border: amber ? '1px solid #fde68a' : featured ? '2px solid #0ea5e9' : '1px solid var(--border)',
      borderRadius: 14,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: featured ? '0 4px 20px rgba(14,165,233,0.15)' : 'none',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {featured && (
        <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 700, color: '#0284c7', background: '#bae6fd', padding: '2px 8px', borderRadius: 20, letterSpacing: '.05em', textTransform: 'uppercase' }}>
          Most popular
        </div>
      )}
      {purple && (
        <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '2px 8px', borderRadius: 20, letterSpacing: '.05em', textTransform: 'uppercase' }}>
          New
        </div>
      )}
      <div style={{ fontSize: 22, marginBottom: 10, height: 30, display: 'flex', alignItems: 'center' }}>{emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: amber ? '#78350f' : featured ? '#0284c7' : purple ? '#6d28d9' : 'var(--text-1)', lineHeight: 1.35, minHeight: 38, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: amber ? '#92400e' : 'var(--text-2)', lineHeight: 1.65, height: 60, overflow: 'hidden', marginBottom: 14 }}>
        {desc}
      </div>
      <div style={{ display: 'flex', border: amber ? '1px solid #fcd34d' : '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', height: 52, flexShrink: 0, marginBottom: 12 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 4px', borderRight: i < stats.length - 1 ? (amber ? '1px solid #fcd34d' : '1px solid var(--border)') : 'none', background: amber ? 'rgba(255,255,255,0.5)' : 'transparent' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: amber ? '#78350f' : featured ? '#0284c7' : purple ? '#6d28d9' : 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1 }}>
              {s.value ?? <span style={{ opacity: 0.3 }}>—</span>}
            </div>
            <div style={{ fontSize: 10, color: amber ? '#92400e' : 'var(--text-3)', marginTop: 3, textAlign: 'center' }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
        {actions.map((a, i) => (
          <Link key={i} to={a.to} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34, borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', background: a.bg, color: a.color, ...(a.border ? { border: a.border } : {}) }}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── MobileJourneyCarousel — peek + dots, mobile only ───────────────────── */
function MobileJourneyCarousel({ cards }) {
  const [idx, setIdx]   = useState(0);
  const trackRef        = useRef(null);
  const touchStartX     = useRef(null);
  const total           = cards.length;
  const CARD_WIDTH      = 258;
  const GAP             = 10;

  function goTo(next) {
    const clamped = Math.max(0, Math.min(total - 1, next));
    setIdx(clamped);
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(calc(-${clamped} * (${CARD_WIDTH}px + ${GAP}px)))`;
    }
  }

  const cardBg = (card) => {
    if (card.featured) return { bg: '#eff6ff', border: '1.5px solid #bfdbfe' };
    if (card.purple)   return { bg: '#fdfbff', border: '0.5px solid #ede9fe' };
    if (card.amber)    return { bg: '#fffbeb', border: '0.5px solid #fde68a' };
    return { bg: '#ffffff', border: '0.5px solid #e8ecf0' };
  };

  const titleColor = (card) => {
    if (card.featured) return '#1e3a8a';
    if (card.purple)   return '#3b0764';
    if (card.amber)    return '#78350f';
    return 'var(--text-1)';
  };

  const descColor = (card) => {
    if (card.featured) return '#3b5998';
    if (card.purple)   return '#7c3aed';
    if (card.amber)    return '#92400e';
    return 'var(--text-2)';
  };

  const statBg = (card) => {
    if (card.featured) return { bg: '#fff', border: '0.5px solid #bfdbfe', valColor: '#1e3a8a', lblColor: '#60a5fa' };
    if (card.purple)   return { bg: '#f5f3ff', border: '0.5px solid #ddd6fe', valColor: '#3b0764', lblColor: '#a78bfa' };
    if (card.amber)    return { bg: 'rgba(255,255,255,0.6)', border: '0.5px solid #fcd34d', valColor: '#78350f', lblColor: '#d97706' };
    return { bg: '#f8fafc', border: '0.5px solid #e8ecf0', valColor: 'var(--text-1)', lblColor: '#94a3b8' };
  };

  return (
    <div style={{ paddingBottom: 4 }}>
      {/* Section header */}
      <div style={{ padding: '0 16px', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          Find your path
        </span>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginTop: 3, letterSpacing: '-0.02em' }}>
          What brings you here today?
        </h2>
      </div>

      {/* Carousel track */}
      <div style={{ overflow: 'hidden' }}>
        <div
          ref={trackRef}
          style={{
            display: 'flex', gap: GAP, padding: '0 16px',
            transition: 'transform 0.32s cubic-bezier(.4,0,.2,1)',
            willChange: 'transform',
          }}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const dx = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(dx) > 40) goTo(idx + (dx > 0 ? 1 : -1));
          }}
        >
          {cards.map((card, i) => {
            const { bg, border } = cardBg(card);
            const { bg: sBg, border: sBorder, valColor, lblColor } = statBg(card);
            return (
              <div key={i} style={{
                flexShrink: 0, width: CARD_WIDTH,
                background: bg, border, borderRadius: 16,
                padding: 18, position: 'relative', overflow: 'hidden',
                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
              }}>
                {/* Score corner */}
                <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, fontWeight: 700, color: 'rgba(0,0,0,0.1)', fontFamily: 'monospace' }}>
                  {[12, 8, 6, 5][i] ?? 4} pts
                </div>

                {/* Badge */}
                {card.featured && (
                  <div style={{ display: 'inline-block', background: '#dbeafe', color: '#1d4ed8', fontSize: 9, fontWeight: 700, borderRadius: 20, padding: '2px 8px', marginBottom: 10, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    Most popular
                  </div>
                )}
                {card.purple && (
                  <div style={{ display: 'inline-block', background: '#ede9fe', color: '#6d28d9', fontSize: 9, fontWeight: 700, borderRadius: 20, padding: '2px 8px', marginBottom: 8, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                    New
                  </div>
                )}

                {/* Emoji */}
                <div style={{ fontSize: 22, marginBottom: 8 }}>{card.emoji}</div>

                {/* Title */}
                <div style={{ fontSize: 15, fontWeight: 700, color: titleColor(card), lineHeight: 1.3, marginBottom: 6 }}>
                  {card.title}
                </div>

                {/* Desc */}
                <div style={{ fontSize: 11, color: descColor(card), lineHeight: 1.55, marginBottom: 14, opacity: card.purple ? 0.8 : 1 }}>
                  {card.desc}
                </div>

                {/* Stat pills */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  {card.stats.map((s, si) => (
                    <div key={si} style={{ background: sBg, border: sBorder, borderRadius: 8, padding: '7px 11px' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: valColor, fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1 }}>
                        {s.value ?? '—'}
                      </div>
                      <div style={{ fontSize: 9, color: lblColor, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {card.actions.map((a, ai) => (
                    <Link key={ai} to={a.to} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: 34, borderRadius: 8, fontSize: 11, fontWeight: 700,
                      textDecoration: 'none', background: a.bg, color: a.color,
                      ...(a.border ? { border: a.border } : {}),
                    }}>
                      {a.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots + arrows */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14, padding: '0 16px' }}>
        <button
          onClick={() => goTo(idx - 1)}
          disabled={idx === 0}
          style={{ width: 28, height: 28, borderRadius: '50%', border: '0.5px solid var(--border)', background: 'var(--panel)', color: 'var(--text-3)', fontSize: 15, cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transition: 'opacity 0.15s' }}
        >‹</button>

        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              onClick={() => goTo(i)}
              style={{
                width: i === idx ? 18 : 6, height: 6,
                borderRadius: 3,
                background: i === idx ? '#3b82f6' : 'var(--bg-4)',
                cursor: 'pointer',
                transition: 'all 0.22s ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(idx + 1)}
          disabled={idx === total - 1}
          style={{ width: 28, height: 28, borderRadius: '50%', border: '0.5px solid var(--border)', background: 'var(--panel)', color: 'var(--text-3)', fontSize: 15, cursor: idx === total - 1 ? 'default' : 'pointer', opacity: idx === total - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transition: 'opacity 0.15s' }}
        >›</button>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const { user } = useContext(AuthContext);
  const isMobile = useIsMobile();

  const [recentSalaries, setRecentSalaries] = useState([]);
  const [totalEntries,   setTotalEntries]   = useState(null);
  const [totalCompanies, setTotalCompanies] = useState(null);
  const [oppCounts,      setOppCounts]      = useState({});
  const [thisMonth,      setThisMonth]      = useState(null);
  const [lastMonth,      setLastMonth]      = useState(null);
  // Track which stat cards are still loading
  const [statsLoaded, setStatsLoaded] = useState({ entries: false, companies: false, opps: false, month: false });

  useEffect(() => {
    // Recent salaries + totalEntries
    api.get('/public/salaries', { params: { page: 0, size: 10 } })
      .then(res => {
        const paged = res.data?.data;
        setRecentSalaries((paged?.content ?? []).map(s => mapSalary(s)));
        setTotalEntries(paged?.totalElements ?? null);
      })
      .catch(console.error)
      .finally(() => setStatsLoaded(p => ({ ...p, entries: true })));

    // Companies count
    api.get('/public/companies', { params: { page: 0, size: 1 } })
      .then(res => setTotalCompanies(res.data?.data?.totalElements ?? null))
      .catch(console.error)
      .finally(() => setStatsLoaded(p => ({ ...p, companies: true })));

    // Opportunity counts by type
    api.get('/public/opportunities/counts')
      .then(res => setOppCounts(res.data?.data ?? {}))
      .catch(console.error)
      .finally(() => setStatsLoaded(p => ({ ...p, opps: true })));

    // This month + last month submissions
    Promise.all([
      api.get('/public/salaries/stats/this-month').catch(() => null),
      api.get('/public/salaries/stats/last-month').catch(() => null),
    ]).then(([thisRes, lastRes]) => {
      setThisMonth(thisRes?.data?.data ?? null);
      setLastMonth(lastRes?.data?.data ?? null);
    }).finally(() => setStatsLoaded(p => ({ ...p, month: true })));
  }, []);

  /* ── Derived opportunity counts ── */
  const internshipCount    = oppCounts.INTERNSHIP ?? null;
  const jobCount           = (oppCounts.REFERRAL ?? 0) + (oppCounts.FULL_TIME ?? 0)
                           + (oppCounts.CONTRACT ?? 0) + (oppCounts.DRIVE ?? 0)
                           || null;
  const totalOpportunities = Object.values(oppCounts).reduce((a, b) => a + b, 0) || null;

  /* ── "This month" trend label ── */
  function monthTrend(current, previous) {
    if (current == null) return null;
    if (previous == null || previous === 0) return { label: 'new this month', emoji: '✨', positive: true };
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct > 20)  return { label: `+${pct}% vs last month`, emoji: '🔥', positive: true };
    if (pct > 0)   return { label: `+${pct}% vs last month`, emoji: '📈', positive: true };
    if (pct === 0) return { label: 'same as last month',     emoji: '➡️', positive: null };
    return           { label: `${pct}% vs last month`,      emoji: '📉', positive: false };
  }
  const trend = monthTrend(thisMonth, lastMonth);

  /* ── Journey card definitions ── */
  const journeyCards = [
    {
      emoji: '💼',
      title: 'Am I paid fairly?',
      featured: true,
      desc: 'Compare your base, bonus and equity against real verified data from peers at your company and level.',
      stats: [
        { value: fmtCount(totalEntries),   label: 'salary entries' },
        { value: fmtCount(totalCompanies), label: 'companies'      },
      ],
      actions: [
        { to: '/salaries',  label: 'Browse salaries →', bg: '#eff6ff', color: '#1d4ed8' },
        { to: '/dashboard', label: 'View analytics →',  bg: '#f5f3ff', color: '#6d28d9' },
      ],
    },
    {
      emoji: '🎯',
      title: 'I\'m negotiating an offer',
      desc: 'See what the company actually pays across roles and levels before your HR call. Walk in knowing your number.',
      stats: [
        { value: fmtCount(totalEntries),   label: 'salary entries' },
        { value: fmtCount(totalCompanies), label: 'companies'      },
        { value: '11',                     label: 'levels'         },
      ],
      actions: [
        { to: '/salaries',         label: 'Browse salaries →', bg: '#eff6ff', color: '#1d4ed8' },
        { to: '/level-guide',         label: 'Compare levels →', bg: '#ecfeff', color: '#0e7490' },
      ],
    },
    {
      emoji: '🔍',
      title: "I'm looking for a job",
      desc: 'Browse community-posted referrals, internships and openings. Get a warm referral and skip straight to the interview queue.',
      stats: [
        { value: fmtCount(jobCount),      label: 'active openings' },
        { value: fmtCount(totalCompanies), label: 'companies'       },
      ],
      actions: [
        { to: '/opportunities',      label: 'Browse opportunities →', bg: '#eff6ff', color: '#1d4ed8' },
        { to: '/companies', label: 'Company profiles →', bg: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)' },
      ],
    },
  ];

  const opportunitiesCard = {
    emoji: '🎓',
    title: "I'm looking for an internship",
    purple: true,
    desc: 'Browse verified internship openings posted by the community. See stipends, duration, and get a referral to jump straight to the queue.',
    stats: [
      { value: fmtCount(internshipCount), label: 'internships'     },
      { value: fmtCount(totalCompanies), label: 'companies'       },
    ],
    actions: [
      { to: '/opportunities',      label: 'Browse internships →',  bg: '#f5f3ff', color: '#6d28d9' },
      { to: '/opportunities/post', label: 'Post an opening →',     bg: '#f5f3ff', color: '#6d28d9' },
    ],
  };


  return (
    <>
      {/* ══════════════════════════════════════════════════════
          ① HERO — tagline left + live ticker right
      ══════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes rippleStat { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.4);opacity:0} }
        @keyframes fadeUpStat { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes countFlash { 0%{opacity:.4;transform:translateY(-4px)} 100%{opacity:1;transform:translateY(0)} }
      `}</style>

      <section className="hero" style={{ padding: isMobile ? '48px 16px 36px' : '56px 24px 48px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 24 : 40, alignItems: 'center' }}>

          {/* Left: tagline + CTAs */}
          <div>
            <div className="hero-eyebrow" style={{ display: 'inline-block', marginBottom: 14 }}>
              🇮🇳 India's tech salary community
            </div>
            <h1 className="hero-title" style={{ marginBottom: 12 }}>
              Make every career<br />decision with <em>confidence.</em>
            </h1>
            <p className="hero-subtitle" style={{ margin: '0 0 28px' }}>
              India's community-powered platform for salary data, referrals, interview prep
              and career growth — 100% anonymous, 100% real.
            </p>
            <div className="hero-cta" style={{ justifyContent: 'flex-start' }}>
              <Link to="/salaries" className="btn-hero btn-hero-primary">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Explore Salaries
              </Link>
              <Link to="/submit" className="btn-hero btn-hero-secondary">Share My Salary →</Link>
            </div>
          </div>

          {/* Right: stat cards — skeleton while loading, trend badge on "this month" */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
            <style>{`
              @keyframes shimmer {
                0%   { background-position: -400px 0; }
                100% { background-position:  400px 0; }
              }
              .stat-skeleton {
                background: linear-gradient(90deg, var(--bg-3) 25%, var(--bg-4) 50%, var(--bg-3) 75%);
                background-size: 800px 100%;
                animation: shimmer 1.4s ease-in-out infinite;
                border-radius: 6px;
              }
            `}</style>
            {[
              { label: '💰 Salary entries', val: totalEntries != null ? fmtCount(totalEntries) : null, sub: 'verified & live', live: true,  delay: 0,   loaded: statsLoaded.entries,   trendPositive: null },
              { label: '🏢 Companies',      val: totalCompanies != null ? fmtCount(totalCompanies) : null, sub: 'tracked',     live: false, delay: 70,  loaded: statsLoaded.companies, trendPositive: null },
              { label: '🤝 Opportunities',  val: totalOpportunities != null ? fmtCount(totalOpportunities) : null, sub: 'live now', live: true, delay: 140, loaded: statsLoaded.opps, trendPositive: null },
              { label: '📅 This month',     val: thisMonth != null ? String(thisMonth) : null, sub: trend ? `${trend.emoji} ${trend.label}` : 'new submissions', live: true, delay: 210, loaded: statsLoaded.month, trendPositive: trend?.positive ?? null },
            ].map(({ label, val, sub, live, delay, loaded, trendPositive }) => (
              <div key={label} style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '13px 14px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                animation: `fadeUpStat .35s ${delay}ms ease both`,
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: '#0ea5e9', borderRadius: '10px 10px 0 0' }} />
                <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', marginBottom: 6 }}>
                  {label}
                </div>
                {!loaded ? (
                  <>
                    <div className="stat-skeleton" style={{ height: 28, width: '60%', marginBottom: 8 }} />
                    <div className="stat-skeleton" style={{ height: 10, width: '80%' }} />
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '-.03em', lineHeight: 1, color: 'var(--text-1)', marginBottom: 5 }}>
                      {val ?? '—'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {live ? (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 8, height: 8, flexShrink: 0 }}>
                          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', animation: 'rippleStat 1.8s ease-out infinite' }} />
                          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', animation: 'rippleStat 1.8s .6s ease-out infinite' }} />
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', position: 'relative', zIndex: 1 }} />
                        </div>
                      ) : (
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: 8.5, fontWeight: 500,
                        color: trendPositive === true ? '#16a34a' : trendPositive === false ? '#dc2626' : 'var(--text-3)',
                      }}>
                        {sub}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>



      {/* ══════════════════════════════════════════════════════
          ③ JOURNEY CARDS — carousel on mobile, grid on desktop
      ══════════════════════════════════════════════════════ */}
      <section style={{ padding: isMobile ? '24px 0' : '36px 24px', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {isMobile ? (
            <MobileJourneyCarousel cards={[...journeyCards, { ...opportunitiesCard }]} />
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <span className="section-tag" style={{ display: 'block', fontSize: 12, letterSpacing: '0.08em' }}>Find your path</span>
                <h2 className="section-title" style={{ fontSize: 28, marginTop: 4 }}>What brings you here today?</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {[...journeyCards, { ...opportunitiesCard }].map((card, i) => (
                  <JourneyCard key={i} {...card} featured={card.featured ?? false} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          ④ RECENT SUBMISSIONS — uses full SalaryTable with logos
      ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 40px', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <span className="section-tag">Recent Submissions</span>
            <h2 className="section-title">Latest <em>salary data</em></h2>
          </div>
          <Link to="/salaries" className="btn-ghost" style={{ padding: '8px 18px', fontSize: 13, whiteSpace: 'nowrap', textDecoration: 'none' }}>
            View all {totalEntries != null ? `${totalEntries.toLocaleString('en-IN')} entries` : ''} →
          </Link>
        </div>
        {/* SalaryTable is untouched — company logos still render as before */}
        <SalaryTable rows={recentSalaries} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          ⑤ CONTRIBUTE CTA — logged-out only (unchanged logic)
      ══════════════════════════════════════════════════════ */}
      {!user && (
        <section style={{ padding: '18px 24px', background: '#0ea5e9' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 3 }}>
                This platform runs on community contributions.
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>
                Share your salary anonymously — every entry makes the data better for everyone.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
              <Link to="/register" style={{ padding: '8px 18px', background: 'white', color: '#0284c7', borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                Create free account
              </Link>
              <Link to="/login" style={{ padding: '8px 18px', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: 'white', borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                Sign in
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import { AuthContext } from '../../context/AuthContext';
import { useLaunchpad } from '../../context/LaunchpadContext';

/* ── helpers (unchanged) ────────────────────────────────────────────────── */
function mapSalary(s) {
  const colors = ['#3ecfb0','#d4a853','#e05c7a','#a08ff0','#c07df0','#e89050'];
  const colorIdx = s.companyName ? s.companyName.charCodeAt(0) % colors.length : 0;
  const color = colors[colorIdx];
  const levelMap = { INTERN:'junior',ENTRY:'junior',MID:'mid',SENIOR:'senior',LEAD:'lead',MANAGER:'lead',DIRECTOR:'lead',VP:'lead',C_LEVEL:'lead' };
  const fmt = (val) => { if (!val && val!==0) return '—'; const l=Number(val)/100000; return l>=100?`₹${(l/100).toFixed(1)}Cr`:`₹${l.toFixed(1)}L`; };
  const formatDate = (iso) => { if (!iso) return ''; return new Date(iso).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
  return { id:s.id, company:s.companyName??'—', companyId:s.companyId??null, logoUrl:s.logoUrl??null, website:s.website??null, compAbbr:s.companyName?s.companyName.slice(0,2).toUpperCase():'?', compColor:color, compBg:`${color}26`, compInd:'', role:s.jobTitle??'—', internalLevel:s.companyInternalLevel??'', level:levelMap[s.experienceLevel]??'mid', location:s.location??'—', exp:s.yearsOfExperience != null ? `${s.yearsOfExperience} yr` : '—', yoe:s.yearsOfExperience != null ? `${s.yearsOfExperience} year${s.yearsOfExperience !== 1 ? 's' : ''}` : '—', empType:s.employmentType??'Full-time', base:fmt(s.baseSalary), bonus:fmt(s.bonus), equity:fmt(s.equity), tc:fmt(s.totalCompensation), status:(s.reviewStatus??'APPROVED').toLowerCase(), recordedAt:formatDate(s.createdAt), notes:'' };
}

function fmtSalary(val) {
  if (!val && val !== 0) return '—';
  const l = Number(val) / 100000;
  return l >= 100 ? `₹${(l/100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
}

function fmtCount(n) {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k+';
  return n.toLocaleString('en-IN');
}

/* ── JourneyCard — equal-height, pixel-aligned ──────────────────────────── */
function JourneyCard({ emoji, title, desc, stats, actions, amber }) {
  return (
    <div style={{
      background: amber ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : 'var(--panel)',
      border: amber ? '1px solid #fde68a' : '1px solid var(--border)',
      borderRadius: 14,
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Emoji */}
      <div style={{ fontSize: 22, marginBottom: 10, height: 30, display: 'flex', alignItems: 'center' }}>
        {emoji}
      </div>

      {/* Title — locked to 2 lines */}
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: amber ? '#78350f' : 'var(--text-1)',
        lineHeight: 1.35,
        minHeight: 34,
        marginBottom: 8,
      }}>
        {title}
      </div>

      {/* Description — locked height = 3 lines so stat strip always same Y */}
      <div style={{
        fontSize: 10,
        color: amber ? '#92400e' : 'var(--text-2)',
        lineHeight: 1.65,
        height: 50,
        overflow: 'hidden',
        marginBottom: 14,
      }}>
        {desc}
      </div>

      {/* Stat strip — fixed height so buttons always same Y */}
      <div style={{
        display: 'flex',
        border: amber ? '1px solid #fcd34d' : '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        height: 52,
        flexShrink: 0,
        marginBottom: 12,
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
            borderRight: i < stats.length - 1
              ? (amber ? '1px solid #fcd34d' : '1px solid var(--border)')
              : 'none',
            background: amber ? 'rgba(255,255,255,0.5)' : 'transparent',
          }}>
            <div style={{
              fontSize: 15, fontWeight: 800,
              color: amber ? '#78350f' : 'var(--text-1)',
              fontFamily: "'IBM Plex Mono',monospace",
              lineHeight: 1,
            }}>
              {s.value ?? <span style={{ opacity: 0.3 }}>—</span>}
            </div>
            <div style={{ fontSize: 9, color: amber ? '#92400e' : 'var(--text-3)', marginTop: 3, textAlign: 'center' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Spacer pushes buttons flush to bottom */}
      <div style={{ flex: 1 }} />

      {/* Buttons — fixed height so always aligned */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
        {actions.map((a, i) => (
          <Link key={i} to={a.to} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 32,
            borderRadius: 6,
            fontSize: 10, fontWeight: 600,
            textDecoration: 'none',
            background: a.bg, color: a.color,
            ...(a.border ? { border: a.border } : {}),
          }}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const { user } = useContext(AuthContext);
  const { stats: launchpadStats } = useLaunchpad();

  const [recentSalaries, setRecentSalaries] = useState([]);
  const [totalEntries,   setTotalEntries]   = useState(null);
  const [totalCompanies, setTotalCompanies] = useState(null);
  const [totalReferrals, setTotalReferrals] = useState(null);
  const [topCompanies,   setTopCompanies]   = useState([]);

  useEffect(() => {
    // Recent salaries + totalEntries
    api.get('/public/salaries', { params: { page: 0, size: 10 } })
      .then(res => {
        const paged = res.data?.data;
        setRecentSalaries((paged?.content ?? []).map(mapSalary));
        setTotalEntries(paged?.totalElements ?? null);
      }).catch(console.error);

    // Top companies (for ticker)
    api.get('/public/salaries/analytics/by-company')
      .then(res => setTopCompanies(res.data?.data ?? []))
      .catch(console.error);

    // Companies count
    api.get('/public/companies', { params: { page: 0, size: 1 } })
      .then(res => setTotalCompanies(res.data?.data?.totalElements ?? null))
      .catch(console.error);

    // Active referrals count
    api.get('/public/referrals', { params: { page: 0, size: 1 } })
      .then(res => setTotalReferrals(res.data?.data?.totalElements ?? null))
      .catch(console.error);
  }, []);

  /* ── Journey card definitions ── */
  const journeyCards = [
    {
      emoji: '💼',
      title: 'Am I paid fairly?',
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
        { to: '/salaries?tab=levels', label: 'Compare levels →', bg: '#ecfeff', color: '#0e7490' },
      ],
    },
    {
      emoji: '🔍',
      title: 'I\'m looking for a job',
      desc: 'Get a warm referral from the community and skip straight to the interview queue at your target company.',
      stats: [
        { value: fmtCount(totalReferrals), label: 'active referrals' },
        { value: fmtCount(totalCompanies), label: 'companies'        },
      ],
      actions: [
        { to: '/referrals', label: 'Browse referrals →', bg: '#fff1f2', color: '#be123c' },
        { to: '/companies', label: 'Company profiles →', bg: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)' },
      ],
    },
  ];

  const launchpadCard = {
    emoji: '🎓',
    title: 'I\'m a college grad starting out',
    desc: 'Crack your first product company interview with curated DSA problems, system design guides and real stories.',
    stats: [
      { value: launchpadStats ? `${launchpadStats.codingProblems}+`        : '—', label: 'coding problems'  },
      { value: launchpadStats ? `${launchpadStats.systemDesignQuestions}+` : '—', label: 'design Qs'        },
      { value: launchpadStats ? String(launchpadStats.interviewExperiences): '—', label: 'stories'          },
    ],
    actions: [
      { to: '/launchpad',        label: 'Go to Launchpad 🚀',      bg: '#d97706', color: '#fff' },
      { to: '/launchpad/submit', label: 'Share your experience →', bg: 'rgba(255,255,255,0.7)', color: '#92400e', border: '1px solid #fcd34d' },
    ],
    amber: true,
  };

  const COMPANY_COLORS = ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          ① HERO — tagline left + live ticker right
      ══════════════════════════════════════════════════════ */}
      <section className="hero" style={{ padding: '56px 24px 48px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 32, alignItems: 'center' }}>

          {/* Left: tagline + CTAs */}
          <div>
            <div className="hero-eyebrow" style={{ display: 'inline-block', marginBottom: 14 }}>
              🇮🇳 India's tech salary community
            </div>
            <h1 className="hero-title" style={{ marginBottom: 10 }}>
              Make every career<br />decision with <em>confidence.</em>
            </h1>
            <p className="hero-subtitle" style={{ margin: '0 0 22px' }}>
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

          {/* Right: live ticker */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Ticker header */}
            <div style={{ padding: '9px 14px', background: 'var(--panel)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'tickerBlink 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>Live salary submissions</span>
              </div>
              {totalEntries != null && (
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
                  {totalEntries.toLocaleString('en-IN')} total
                </span>
              )}
            </div>

            {/* Ticker rows — uses CompanyLogo just like top-companies did */}
            {topCompanies.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>Loading…</div>
            ) : (
              topCompanies.slice(0, 5).map((co, i) => (
                <div key={co.groupKey} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <CompanyLogo companyId={co.companyId} companyName={co.groupKey ?? ''} logoUrl={co.logoUrl} website={co.website} size={24} radius={6} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{co.groupKey}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', flex: 1.2 }}>
                    {co.topRole ?? 'Software Engineer'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', fontFamily: "'IBM Plex Mono',monospace" }}>
                    {fmtSalary(co.avgBaseSalary)}
                  </span>
                </div>
              ))
            )}

            <div style={{ padding: '7px 14px', background: 'var(--panel)', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-4)', textAlign: 'center' }}>
              Updated continuously · <span style={{ color: '#0ea5e9', fontWeight: 600 }}>100% anonymous</span>
            </div>
          </div>
        </div>
      </section>

      {/* Blink animation for live dot */}
      <style>{`
        @keyframes tickerBlink { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          ② SALARY DATABASE — core feature, full-width blue
      ══════════════════════════════════════════════════════ */}
      <section style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', padding: '22px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.9)', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', padding: '2px 9px', borderRadius: 20, marginBottom: 8, letterSpacing: '.05em', textTransform: 'uppercase' }}>
              ⭐ Core Feature
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 6 }}>Salary Database</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', lineHeight: 1.65, marginBottom: 14 }}>
              The most comprehensive anonymous salary database for India's tech industry. Browse real base, bonus and equity data — filtered by company, role, internal level and city.
            </div>
            <Link to="/salaries" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'white', color: '#0284c7', borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Browse all salaries
            </Link>
          </div>
          {/* Trust stats */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { val: totalEntries != null ? totalEntries.toLocaleString('en-IN') : '—', lbl: 'verified entries' },
              { val: totalCompanies != null ? totalCompanies.toLocaleString('en-IN') : '—', lbl: 'companies' },
              { val: '8', lbl: 'cities' },
            ].map(({ val, lbl }) => (
              <div key={lbl} style={{ flex: 1, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'white', fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '-0.02em', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.7)', marginTop: 4 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          ③ JOURNEY CARDS — equal height, pixel-aligned
      ══════════════════════════════════════════════════════ */}
      <section className="section" style={{ paddingTop: 36, paddingBottom: 36, background: 'var(--bg-2)' }}>
        <div style={{ marginBottom: 20 }}>
          <span className="section-tag" style={{ display: 'block' }}>Find your path</span>
          <h2 className="section-title">What brings you here today?</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[...journeyCards, { ...launchpadCard }].map((card, i) => (
            <JourneyCard key={i} {...card} />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          ④ RECENT SUBMISSIONS — uses full SalaryTable with logos
      ══════════════════════════════════════════════════════ */}
      <section className="section salaries-section" style={{ paddingTop: 0 }}>
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

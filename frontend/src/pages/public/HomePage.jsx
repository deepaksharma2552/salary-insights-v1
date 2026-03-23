import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import { AuthContext } from '../../context/AuthContext';

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
      {/* Featured badge */}
      {featured && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 9, fontWeight: 700, color: '#0284c7',
          background: '#bae6fd', padding: '2px 8px',
          borderRadius: 20, letterSpacing: '.05em', textTransform: 'uppercase',
        }}>
          Most popular
        </div>
      )}
      {purple && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 9, fontWeight: 700, color: '#6d28d9',
          background: '#ede9fe', padding: '2px 8px',
          borderRadius: 20, letterSpacing: '.05em', textTransform: 'uppercase',
        }}>
          New
        </div>
      )}
      {/* Emoji */}
      <div style={{ fontSize: 22, marginBottom: 10, height: 30, display: 'flex', alignItems: 'center' }}>
        {emoji}
      </div>

      {/* Title — locked to 2 lines */}
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: amber ? '#78350f' : featured ? '#0284c7' : purple ? '#6d28d9' : 'var(--text-1)',
        lineHeight: 1.35,
        minHeight: 38,
        marginBottom: 8,
      }}>
        {title}
      </div>

      {/* Description — locked height = 3 lines so stat strip always same Y */}
      <div style={{
        fontSize: 12,
        color: amber ? '#92400e' : 'var(--text-2)',
        lineHeight: 1.65,
        height: 60,
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
              color: amber ? '#78350f' : featured ? '#0284c7' : purple ? '#6d28d9' : 'var(--text-1)',
              fontFamily: "'IBM Plex Mono',monospace",
              lineHeight: 1,
            }}>
              {s.value ?? <span style={{ opacity: 0.3 }}>—</span>}
            </div>
            <div style={{ fontSize: 10, color: amber ? '#92400e' : 'var(--text-3)', marginTop: 3, textAlign: 'center' }}>
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
            height: 34,
            borderRadius: 6,
            fontSize: 12, fontWeight: 600,
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

  const [recentSalaries, setRecentSalaries] = useState([]);
  const [totalEntries,   setTotalEntries]   = useState(null);
  const [totalCompanies, setTotalCompanies] = useState(null);
  const [totalReferrals,  setTotalReferrals]  = useState(null);
  const [thisMonth,       setThisMonth]       = useState(null);

  useEffect(() => {
    // Recent salaries + totalEntries
    api.get('/public/salaries', { params: { page: 0, size: 10 } })
      .then(res => {
        const paged = res.data?.data;
        setRecentSalaries((paged?.content ?? []).map(mapSalary));
        setTotalEntries(paged?.totalElements ?? null);
      }).catch(console.error);

    // Companies count
    api.get('/public/companies', { params: { page: 0, size: 1 } })
      .then(res => setTotalCompanies(res.data?.data?.totalElements ?? null))
      .catch(console.error);

    // Active referrals count
    api.get('/public/referrals', { params: { page: 0, size: 1 } })
      .then(res => setTotalReferrals(res.data?.data?.totalElements ?? null))
      .catch(console.error);

    // Submissions this month
    api.get('/public/salaries/stats/this-month')
      .then(res => setThisMonth(res.data?.data ?? null))
      .catch(console.error);
  }, []);

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
        { to: '/salaries?tab=levels', label: 'Compare levels →', bg: '#ecfeff', color: '#0e7490' },
      ],
    },
    {
      emoji: '🔍',
      title: "I'm looking for a job",
      desc: 'Browse community-posted referrals, internships and openings. Get a warm referral and skip straight to the interview queue.',
      stats: [
        { value: fmtCount(totalReferrals), label: 'active openings' },
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
      { value: fmtCount(totalReferrals), label: 'internships'     },
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

      <section className="hero" style={{ padding: '56px 24px 48px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>

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

          {/* Right: Palette 3 stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
            {[
              { label: '💰 Salary entries', val: totalEntries != null ? fmtCount(totalEntries) : '—', sub: 'verified & live', live: true, delay: 0 },
              { label: '🏢 Companies',      val: totalCompanies != null ? fmtCount(totalCompanies) : '—',    sub: 'tracked',        live: false, delay: 70 },
              { label: '🤝 Active referrals', val: totalReferrals != null ? fmtCount(totalReferrals) : '—', sub: 'live now',       live: true, delay: 140 },
              { label: '📅 This month',     val: thisMonth != null ? String(thisMonth) : '—',                sub: 'new submissions', live: true,  delay: 210 },
            ].map(({ label, val, sub, live, delay }) => (
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
                {/* Sky blue top accent bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: '#0ea5e9', borderRadius: '10px 10px 0 0' }} />

                <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', marginBottom: 6 }}>
                  {label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: '-.03em', lineHeight: 1, color: 'var(--text-1)', marginBottom: 5 }}>
                  {val}
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
                  <span style={{ fontSize: 8.5, fontWeight: 500, color: 'var(--text-3)' }}>{sub}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>



      {/* ══════════════════════════════════════════════════════
          ③ JOURNEY CARDS — equal height, pixel-aligned
      ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '36px 24px', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <span className="section-tag" style={{ display: 'block', fontSize: 12, letterSpacing: '0.08em' }}>Find your path</span>
          <h2 className="section-title" style={{ fontSize: 28, marginTop: 4 }}>What brings you here today?</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[...journeyCards, { ...opportunitiesCard }].map((card, i) => (
            <JourneyCard key={i} {...card} featured={card.featured ?? false} />
          ))}
        </div>
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

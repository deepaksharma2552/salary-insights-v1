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
function JourneyCard({ emoji, title, desc, stats, actions, amber, featured }) {
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
      {/* Emoji */}
      <div style={{ fontSize: 22, marginBottom: 10, height: 30, display: 'flex', alignItems: 'center' }}>
        {emoji}
      </div>

      {/* Title — locked to 2 lines */}
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: amber ? '#78350f' : featured ? '#0284c7' : 'var(--text-1)',
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
              color: amber ? '#78350f' : featured ? '#0284c7' : 'var(--text-1)',
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
  const { stats: launchpadStats } = useLaunchpad();

  const [recentSalaries, setRecentSalaries] = useState([]);
  const [totalEntries,   setTotalEntries]   = useState(null);
  const [totalCompanies, setTotalCompanies] = useState(null);
  const [totalReferrals, setTotalReferrals] = useState(null);

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


  return (
    <>
      {/* ══════════════════════════════════════════════════════
          ① HERO — tagline left + live ticker right
      ══════════════════════════════════════════════════════ */}
      <section className="hero" style={{ padding: '56px 24px 48px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
          <div className="hero-eyebrow" style={{ display: 'inline-block', marginBottom: 14 }}>
            🇮🇳 India's tech salary community
          </div>
          <h1 className="hero-title" style={{ marginBottom: 12, maxWidth: 700 }}>
            Make every career<br />decision with <em>confidence.</em>
          </h1>
          <p className="hero-subtitle" style={{ margin: '0 0 28px', maxWidth: 560 }}>
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
          {[...journeyCards, { ...launchpadCard }].map((card, i) => (
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

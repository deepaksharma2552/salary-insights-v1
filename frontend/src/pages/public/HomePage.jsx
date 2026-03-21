import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import { AuthContext } from '../../context/AuthContext';
import { useLaunchpad } from '../../context/LaunchpadContext';

/* ── helpers ─────────────────────────────────────────────────────────────── */
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

/* ── StatPill — the small number+label inside journey cards ─────────────── */
function StatPill({ value, label, borderRight }) {
  return (
    <div style={{
      flex: 1, padding: '10px 12px',
      borderRight: borderRight ? '1px solid var(--border)' : 'none',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1 }}>
        {value ?? <span style={{ opacity: 0.3 }}>—</span>}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

/* ── Journey card ─────────────────────────────────────────────────────────── */
function JourneyCard({ emoji, title, desc, stats, actions, amber }) {
  const cardStyle = amber ? {
    background: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
    border: '1px solid #fde68a',
  } : {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
  };

  const statsBoxStyle = amber ? {
    background: 'rgba(255,255,255,0.6)',
    border: '1px solid #fcd34d',
  } : {
    border: '1px solid var(--border)',
  };

  return (
    <div style={{ ...cardStyle, borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: 22, marginBottom: 14 }}>{emoji}</div>

      <div style={{ fontSize: 14, fontWeight: 700, color: amber ? '#78350f' : 'var(--text-1)', marginBottom: 6, lineHeight: 1.3 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: amber ? '#92400e' : 'var(--text-2)', lineHeight: 1.65, marginBottom: 16 }}>
        {desc}
      </div>

      {/* Stat pills */}
      <div style={{ ...statsBoxStyle, borderRadius: 9, overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
        {stats.map((s, i) => (
          <StatPill key={i} value={s.value} label={s.label} borderRight={i < stats.length - 1} />
        ))}
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
        {actions.map((a, i) => (
          <Link key={i} to={a.to} style={{
            display: 'block', padding: '8px 14px', borderRadius: 7,
            fontSize: 12, fontWeight: 600, textDecoration: 'none', textAlign: 'center',
            background: a.bg, color: a.color,
          }}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const { user }  = useContext(AuthContext);
  const { stats: launchpadStats } = useLaunchpad();

  const [recentSalaries,  setRecentSalaries]  = useState([]);
  const [totalEntries,    setTotalEntries]     = useState(null);
  const [totalCompanies,  setTotalCompanies]   = useState(null);
  const [totalReferrals,  setTotalReferrals]   = useState(null);
  const [topCompanies,    setTopCompanies]     = useState([]);

  const COMPANY_COLORS = ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];

  useEffect(() => {
    // Salaries — existing call, also gives us totalEntries
    api.get('/public/salaries', { params: { page: 0, size: 10 } })
      .then(res => {
        const paged = res.data?.data;
        setRecentSalaries((paged?.content ?? []).map(mapSalary));
        setTotalEntries(paged?.totalElements ?? null);
      }).catch(console.error);

    // Top companies — existing call
    api.get('/public/salaries/analytics/by-company')
      .then(res => setTopCompanies(res.data?.data ?? []))
      .catch(console.error);

    // Companies count — existing call
    api.get('/public/companies', { params: { page: 0, size: 1 } })
      .then(res => setTotalCompanies(res.data?.data?.totalElements ?? null))
      .catch(console.error);

    // Active referrals count — page 1 size 1, read totalElements
    api.get('/public/referrals', { params: { page: 0, size: 1 } })
      .then(res => setTotalReferrals(res.data?.data?.totalElements ?? null))
      .catch(console.error);
  }, []);

  /* ── Journey card definitions ── */
  const journeyCards = [
    {
      emoji: '💼',
      title: 'I want to check if I\'m paid fairly',
      desc:  'Browse salaries at your company and role. See how your comp stacks up against the market.',
      stats: [
        { value: fmtCount(totalEntries),   label: 'salary entries'  },
        { value: fmtCount(totalCompanies), label: 'companies'       },
      ],
      actions: [
        { to: '/salaries',  label: 'Browse salaries →',  bg: '#eff6ff', color: '#1d4ed8' },
        { to: '/dashboard', label: 'View analytics →',   bg: '#f5f3ff', color: '#6d28d9' },
      ],
    },
    {
      emoji: '🎯',
      title: 'I\'m negotiating an offer',
      desc:  'See real comp data for the company and role you\'re interviewing for. Know your worth before you negotiate.',
      stats: [
        { value: fmtCount(totalEntries),   label: 'salary entries'  },
        { value: fmtCount(totalCompanies), label: 'companies'        },
        { value: '6',                       label: 'exp. levels'      },
      ],
      actions: [
        { to: '/salaries',  label: 'Browse salaries →',  bg: '#eff6ff', color: '#1d4ed8' },
        { to: '/salaries?tab=levels', label: 'Compare levels →', bg: '#ecfeff', color: '#0e7490' },
      ],
    },
    {
      emoji: '🔍',
      title: 'I\'m looking for a job',
      desc:  'Find referral links from the community to skip the queue and get a warm introduction to your dream company.',
      stats: [
        { value: fmtCount(totalReferrals),  label: 'active referrals' },
        { value: fmtCount(totalCompanies),  label: 'companies'        },
      ],
      actions: [
        { to: '/referrals',  label: 'Browse referrals →', bg: '#fff1f2', color: '#be123c' },
        { to: '/companies',  label: 'Company profiles →', bg: 'var(--bg-2)', color: 'var(--text-2)' },
      ],
    },
  ];

  const launchpadCard = {
    emoji: '🎓',
    title: 'I\'m a college grad starting out',
    desc:  'Launchpad — everything you need to crack interviews at top product companies.',
    stats: [
      { value: launchpadStats ? `${launchpadStats.codingProblems}+`         : '—', label: 'coding problems'   },
      { value: launchpadStats ? `${launchpadStats.systemDesignQuestions}+`  : '—', label: 'system design Qs'  },
      { value: launchpadStats ? String(launchpadStats.interviewExperiences) : '—', label: 'interview stories' },
    ],
    actions: [
      { to: '/launchpad',        label: 'Go to Launchpad 🚀',      bg: '#d97706', color: '#fff'     },
      { to: '/launchpad/submit', label: 'Share your experience →', bg: 'rgba(255,255,255,0.7)', color: '#92400e' },
    ],
    amber: true,
  };

  return (
    <>
      {/* ── HERO (unchanged) ── */}
      <section className="hero" style={{ padding: '80px 24px 64px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 56, flexWrap: 'wrap' }}>

          <div style={{ flex: '1 1 400px', maxWidth: 540, textAlign: 'left' }}>
            <div className="hero-eyebrow" style={{ display: 'inline-block' }}>360° Compensation Intelligence</div>
            <h1 className="hero-title" style={{ marginTop: 16 }}>
              Your complete<br /><em>360° view</em> of pay.
            </h1>
            <p className="hero-subtitle" style={{ margin: '16px 0 32px', textAlign: 'left' }}>
              SalaryInsights360 gives you the full picture — base, bonus, equity, and total comp —
              crowd-sourced across thousands of companies and roles, verified by our team.
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

          {/* Right: stat cards + top companies */}
          <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', borderTop: '3px solid #0ea5e9' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Salary Entries</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.03em', fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                  {totalEntries != null ? totalEntries.toLocaleString('en-IN') : <span style={{ opacity: 0.3 }}>—</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  approved &amp; verified
                </div>
              </div>
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', borderTop: '3px solid #8b5cf6' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Companies</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.03em', fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                  {totalCompanies != null ? totalCompanies.toLocaleString('en-IN') : <span style={{ opacity: 0.3 }}>—</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  tracked &amp; growing
                </div>
              </div>
            </div>

            {/* Top paying companies */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>🏆 Top Paying Companies</div>
                <Link to="/dashboard" style={{ fontSize: 11, color: '#0ea5e9', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>
              </div>
              {topCompanies.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-4)', textAlign: 'center', padding: '12px 0' }}>Loading…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topCompanies.slice(0, 10).map((co, i) => {
                    const maxVal = topCompanies[0]?.avgBaseSalary ?? 1;
                    const pct    = Math.round(((co.avgBaseSalary ?? 0) / maxVal) * 100);
                    const color  = COMPANY_COLORS[i % COMPANY_COLORS.length];
                    return (
                      <div key={co.groupKey} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', fontFamily: "'IBM Plex Mono',monospace", minWidth: 16, textAlign: 'right' }}>{i + 1}</span>
                        <CompanyLogo companyId={co.companyId} companyName={co.groupKey ?? ''} logoUrl={co.logoUrl} website={co.website} size={22} radius={6} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.groupKey}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>{fmtSalary(co.avgBaseSalary)}</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 100, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── JOURNEY CARDS ── */}
      <section className="section" style={{ paddingTop: 48, paddingBottom: 40 }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <span className="section-tag" style={{ display: 'block' }}>Find your path</span>
          <h2 className="section-title">What brings you here today?</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
          {journeyCards.map((card, i) => (
            <JourneyCard key={i} {...card} />
          ))}
          <JourneyCard {...launchpadCard} />
        </div>
      </section>

      {/* ── RECENT SUBMISSIONS (unchanged) ── */}
      <section className="section salaries-section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <span className="section-tag">Recent Submissions</span>
            <h2 className="section-title">Latest <em>salary data</em></h2>
          </div>
          <Link to="/salaries" className="btn-ghost" style={{ padding: '8px 18px', fontSize: 13, whiteSpace: 'nowrap', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>
        <SalaryTable rows={recentSalaries} />
      </section>

      {/* ── CONTRIBUTE CTA — logged-out only ── */}
      {!user && (
        <section style={{
          padding: '28px 24px',
          background: 'var(--panel)',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
                This platform runs on community contributions.
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                Share your salary anonymously — every entry makes the data better for everyone.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
              <Link to="/register" className="btn-hero btn-hero-primary" style={{ padding: '9px 20px', fontSize: 13 }}>
                Create free account
              </Link>
              <Link to="/login" className="btn-hero btn-hero-secondary" style={{ padding: '9px 20px', fontSize: 13 }}>
                Sign in
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

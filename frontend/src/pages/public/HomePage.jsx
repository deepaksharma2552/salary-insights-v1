import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

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

export default function HomePage() {
  const [recentSalaries, setRecentSalaries] = useState([]);
  const [totalEntries,   setTotalEntries]   = useState(null);
  const [totalCompanies, setTotalCompanies] = useState(null);
  const [topCompanies,   setTopCompanies]   = useState([]);

  useEffect(() => {
    api.get('/public/salaries', { params: { page: 0, size: 10 } })
      .then(res => {
        const paged = res.data?.data;
        setRecentSalaries((paged?.content ?? []).map(mapSalary));
        setTotalEntries(paged?.totalElements ?? null);
      }).catch(console.error);

    api.get('/public/salaries/analytics/by-company')
      .then(res => setTopCompanies(res.data?.data ?? []))
      .catch(console.error);

    api.get('/public/companies', { params: { page: 0, size: 1 } })
      .then(res => setTotalCompanies(res.data?.data?.totalElements ?? null))
      .catch(console.error);
  }, []);

  const COMPANY_COLORS = ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero" style={{ padding: '80px 24px 64px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 56, flexWrap: 'wrap' }}>

          {/* ── LEFT ── */}
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

          {/* ── RIGHT: Metrics panel ── */}
          <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Stat cards row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

              {/* Salary Entries */}
              <div style={{
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '16px 18px',
                borderTop: '3px solid #0ea5e9',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Salary Entries
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.03em', fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                  {totalEntries != null ? totalEntries.toLocaleString('en-IN') : <span style={{ opacity: 0.3 }}>—</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#0ea5e9" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  approved &amp; verified
                </div>
              </div>

              {/* Companies Tracked */}
              <div style={{
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '16px 18px',
                borderTop: '3px solid #8b5cf6',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Companies
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.03em', fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                  {totalCompanies != null ? totalCompanies.toLocaleString('en-IN') : <span style={{ opacity: 0.3 }}>—</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  tracked &amp; growing
                </div>
              </div>
            </div>

            {/* Top 10 Paying Companies */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  🏆 Top 10 Paying Companies
                </div>
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
                        {/* Rank */}
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', fontFamily: "'IBM Plex Mono',monospace", minWidth: 16, textAlign: 'right' }}>
                          {i + 1}
                        </span>
                        {/* Company Logo */}
                        <CompanyLogo
                          companyId={co.companyId}
                          companyName={co.groupKey ?? ''}
                          logoUrl={co.logoUrl}
                          website={co.website}
                          size={22}
                          radius={6}
                        />
                        {/* Bar */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {co.groupKey}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace" }}>
                              {fmtSalary(co.avgBaseSalary)}
                            </span>
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

      {/* ── RECENT SUBMISSIONS ── */}
      <section className="section salaries-section">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:16, marginBottom:24 }}>
          <div>
            <span className="section-tag">Recent Submissions</span>
            <h2 className="section-title">Latest <em>salary data</em></h2>
          </div>
          <Link to="/salaries" className="btn-ghost" style={{ padding:'8px 18px', fontSize:13, whiteSpace:'nowrap', textDecoration:'none' }}>
            View all →
          </Link>
        </div>
        <SalaryTable rows={recentSalaries} />
      </section>
    </>
  );
}

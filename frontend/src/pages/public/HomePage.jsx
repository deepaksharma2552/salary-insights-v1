import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';

function mapSalary(s) {
  const colors = ['#3ecfb0','#d4a853','#e05c7a','#a08ff0','#c07df0','#e89050'];
  const colorIdx = s.companyName ? s.companyName.charCodeAt(0) % colors.length : 0;
  const color = colors[colorIdx];
  const levelMap = { INTERN:'junior',ENTRY:'junior',MID:'mid',SENIOR:'senior',LEAD:'lead',MANAGER:'lead',DIRECTOR:'lead',VP:'lead',C_LEVEL:'lead' };
  const fmt = (val) => { if (!val && val!==0) return '—'; const l=Number(val)/100000; return l>=100?`₹${(l/100).toFixed(1)}Cr`:`₹${l.toFixed(1)}L`; };
  const formatDate = (iso) => { if (!iso) return ''; return new Date(iso).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
  return { id:s.id, company:s.companyName??'—', compAbbr:s.companyName?s.companyName.slice(0,2).toUpperCase():'?', compColor:color, compBg:`${color}26`, compInd:'', role:s.jobTitle??'—', internalLevel:s.companyInternalLevel??'', level:levelMap[s.experienceLevel]??'mid', location:s.location??'—', exp:s.yearsOfExperience != null ? `${s.yearsOfExperience} yr` : '—', yoe:s.yearsOfExperience != null ? `${s.yearsOfExperience} year${s.yearsOfExperience !== 1 ? 's' : ''}` : '—', empType:s.employmentType??'Full-time', base:fmt(s.baseSalary), bonus:fmt(s.bonus), equity:fmt(s.equity), tc:fmt(s.totalCompensation), status:(s.reviewStatus??'APPROVED').toLowerCase(), recordedAt:formatDate(s.createdAt), notes:'' };
}

export default function HomePage() {
  const [recentSalaries, setRecentSalaries] = useState([]);
  const [stats, setStats] = useState({ avgBase: null, totalEntries: null, totalCompanies: null });

  useEffect(() => {
    // Load recent salaries
    api.get('/public/salaries', { params: { page: 0, size: 10 } })
      .then(res => {
        const paged = res.data?.data;
        setRecentSalaries((paged?.content ?? []).map(mapSalary));
        setStats(s => ({ ...s, totalEntries: paged?.totalElements ?? null }));
      })
      .catch(console.error);

    // Load avg base salary from analytics
    api.get('/public/salaries/analytics/by-company')
      .then(res => {
        const rows = res.data?.data ?? [];
        if (rows.length > 0) {
          const avg = rows.reduce((sum, r) => sum + (r.avgBaseSalary ?? 0), 0) / rows.length;
          const l = avg / 100000;
          const formatted = l >= 100 ? `₹${(l/100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
          setStats(s => ({ ...s, avgBase: formatted }));
        }
      })
      .catch(console.error);

    // Load company count
    api.get('/public/companies', { params: { page: 0, size: 1 } })
      .then(res => setStats(s => ({ ...s, totalCompanies: res.data?.data?.totalElements ?? null })))
      .catch(console.error);
  }, []);

  const fmt = (val) => val != null ? val.toLocaleString('en-IN') : '—';

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <div style={{
          maxWidth: 1200, margin: '0 auto', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 48, flexWrap: 'wrap',
        }}>

          {/* ── LEFT: Content + CTAs ── */}
          <div style={{ flex: '1 1 400px', maxWidth: 580, textAlign: 'left' }}>
            <div className="hero-eyebrow" style={{ display: 'inline-block' }}>
              360° Compensation Intelligence
            </div>
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
              <Link to="/submit" className="btn-hero btn-hero-secondary">
                Share My Salary →
              </Link>
            </div>
          </div>

          {/* ── RIGHT: Live stats ── */}
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
            {[
              {
                label: 'Avg. Base Salary',
                value: stats.avgBase ?? '—',
                delta: 'across all companies',
                icon: '💰',
              },
              {
                label: 'Salary Entries',
                value: stats.totalEntries != null ? fmt(stats.totalEntries) : '—',
                delta: 'approved & verified',
                icon: '📊',
              },
              {
                label: 'Companies Tracked',
                value: stats.totalCompanies != null ? fmt(stats.totalCompanies) : '—',
                delta: 'and growing',
                icon: '🏢',
              },
            ].map((stat, i) => (
              <div key={stat.label} className="stat-card-float fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{stat.icon}</span>
                  <div className="stat-label">{stat.label}</div>
                </div>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-delta">{stat.delta}</div>
              </div>
            ))}
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

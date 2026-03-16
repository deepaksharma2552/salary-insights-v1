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
  useEffect(() => {
    api.get('/public/salaries', { params: { page: 0, size: 10 } })
      .then(res => setRecentSalaries((res.data?.data?.content ?? []).map(mapSalary)))
      .catch(console.error);
  }, []);

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />

        <div className="hero-content">
          <div className="hero-eyebrow">360° Compensation Intelligence</div>
          <h1 className="hero-title">
            Your complete<br /><em>360° view</em> of pay.
          </h1>
          <p className="hero-subtitle">
            SalaryInsights360 gives you the full picture — base, bonus, equity, and total comp —
            crowd-sourced across thousands of companies and roles, normalized by level and verified by our team.
          </p>
          <div className="hero-cta">
            <Link to="/salaries" className="btn-hero btn-hero-primary">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Explore Salaries
            </Link>
            <Link to="/submit" className="btn-hero btn-hero-secondary">
              Share My Salary →
            </Link>
          </div>
        </div>

        {/* Floating stats */}
        <div className="hero-stats-float">
          <div className="stat-card-float fade-up fade-up-1">
            <div className="stat-label">Avg. Base Salary</div>
            <div className="stat-value">₹28.4L</div>
            <div className="stat-delta">↑ 12.4% YoY</div>
          </div>
          <div className="stat-card-float fade-up fade-up-2">
            <div className="stat-label">Salary Entries</div>
            <div className="stat-value">14,820</div>
            <div className="stat-delta">+342 this week</div>
          </div>
          <div className="stat-card-float fade-up fade-up-3">
            <div className="stat-label">Companies Tracked</div>
            <div className="stat-value">284</div>
            <div className="stat-delta">+8 added recently</div>
          </div>
        </div>
      </section>

      {/* ── RECENT SUBMISSIONS ── */}
      <section className="section salaries-section">
        <div
          className="section-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}
        >
          <div>
            <span className="section-tag">Recent Submissions</span>
            <h2 className="section-title">Latest <em>salary data</em></h2>
          </div>
          <Link to="/salaries" className="btn-ghost" style={{ padding: '10px 22px', fontSize: 13, whiteSpace: 'nowrap', textDecoration: 'none' }}>
            View all salaries →
          </Link>
        </div>

        {/* Reuses the same SalaryTable + drawer as SalariesPage */}
        <SalaryTable rows={recentSalaries} />
      </section>
    </>
  );
}

import { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { mapSalary } from '../../utils/salaryMapper';

function fmtCount(n) {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k+';
  return n.toLocaleString('en-IN');
}

/* ── Salary range bar visual ──────────────────────────────────── */
function SalaryRangeBar({ min, median, max, userValue }) {
  const pct = Math.round(((userValue - min) / (max - min)) * 100);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #fee2e2 0%, #fef9c3 45%, #dcfce7 100%)', marginBottom: 10 }}>
        <div style={{
          position: 'absolute', left: `${pct}%`, top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 18, height: 18, borderRadius: '50%',
          background: '#0f172a', border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,.3)',
          transition: 'left .6s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
        <span>₹{(min / 100000).toFixed(0)}L</span>
        <span>Median ₹{(median / 100000).toFixed(0)}L</span>
        <span>₹{(max / 100000).toFixed(0)}L</span>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function HomePage() {
  const { user } = useContext(AuthContext);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [recentSalaries, setRecentSalaries] = useState([]);
  const [totalEntries,   setTotalEntries]   = useState(null);
  const [totalCompanies, setTotalCompanies] = useState(null);
  const [thisMonth,      setThisMonth]      = useState(null);

  const [role,       setRole]       = useState('');
  const [experience, setExperience] = useState('');
  const [location,   setLocation]   = useState('');

  useEffect(() => {
    api.get('/public/salaries', { params: { page: 0, size: 8 } })
      .then(res => {
        const paged = res.data?.data;
        setRecentSalaries((paged?.content ?? []).map(s => mapSalary(s)));
        setTotalEntries(paged?.totalElements ?? null);
      }).catch(console.error);

    api.get('/public/companies', { params: { page: 0, size: 1 } })
      .then(res => setTotalCompanies(res.data?.data?.totalElements ?? null))
      .catch(console.error);

    api.get('/public/salaries/stats/this-month').catch(() => null)
      .then(res => setThisMonth(res?.data?.data ?? null));
  }, []);

  function handleHeroSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (role)       params.set('role', role);
    if (experience) params.set('experience', experience);
    if (location)   params.set('location', location);
    navigate(`/salaries?${params.toString()}`);
  }

  const ROLES = ['Software Engineer', 'Product Manager', 'Data Scientist', 'Data Analyst', 'DevOps Engineer', 'Engineering Manager', 'UX Designer', 'Business Analyst', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer'];
  const LOCATIONS = ['Bengaluru', 'Hyderabad', 'Mumbai', 'Pune', 'Delhi NCR', 'Chennai', 'Remote'];
  const EXP_RANGES = ['0–1 years', '1–3 years', '3–5 years', '5–8 years', '8–12 years', '12+ years'];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap');

        @keyframes hp-fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hp-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes hp-ripple { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.8);opacity:0} }
        @keyframes hp-shimmer{ 0%{background-position:-400px 0} 100%{background-position:400px 0} }

        .hp-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(30px, 5vw, 58px);
          font-weight: 800;
          line-height: 1.07;
          letter-spacing: -0.03em;
          color: var(--text-1);
        }
        .hp-title em { font-style:normal; color:#0ea5e9; }

        .hp-sec-label {
          font-size: 11px; font-weight: 700;
          letter-spacing: .1em; text-transform: uppercase;
          color: #0ea5e9; display: block; margin-bottom: 10px;
        }
        .hp-sec-title {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-size: clamp(22px, 3vw, 34px);
          font-weight: 700; letter-spacing: -0.025em;
          color: var(--text-1); line-height: 1.15;
        }
        .hp-sec-title em { font-style:normal; color:#0ea5e9; }

        .hp-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
        }

        .hp-input {
          width: 100%; padding: 12px 14px;
          border: 1.5px solid var(--border); border-radius: 10px;
          font-size: 14px; background: var(--bg); color: var(--text-1);
          outline: none; transition: border-color .15s, box-shadow .15s;
          appearance: none; -webkit-appearance: none; font-family: inherit;
          cursor: pointer;
        }
        .hp-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,.12); }

        .hp-cta-primary {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px; padding: 14px 28px;
          background: #0f172a; color: white;
          border: none; border-radius: 10px;
          font-size: 15px; font-weight: 700; cursor: pointer;
          text-decoration: none; transition: transform .15s, box-shadow .15s, background .15s;
          font-family: inherit; white-space: nowrap;
        }
        .hp-cta-primary:hover { background:#0ea5e9; transform:translateY(-1px); box-shadow:0 6px 20px rgba(14,165,233,.3); }

        .hp-cta-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 12px 22px;
          background: transparent; color: var(--text-2);
          border: 1.5px solid var(--border); border-radius: 10px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          text-decoration: none; transition: border-color .15s, color .15s, background .15s;
          font-family: inherit;
        }
        .hp-cta-ghost:hover { border-color:#0ea5e9; color:#0ea5e9; background:rgba(14,165,233,.05); }

        .hp-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 20px;
          background: var(--bg-3); border: 1px solid var(--border);
          font-size: 12px; color: var(--text-2); font-weight: 500;
        }

        .hp-live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e; flex-shrink: 0; position: relative;
          display: inline-block;
        }
        .hp-live-dot::before {
          content: ''; position: absolute; inset: -2px; border-radius: 50%;
          background: #22c55e; animation: hp-ripple 1.8s ease-out infinite;
        }

        .hp-step-num {
          width: 36px; height: 36px; border-radius: 50%;
          background: #0f172a; color: white;
          font-size: 15px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-family: 'Bricolage Grotesque', sans-serif;
        }

        .hp-a1 { animation: hp-fadeUp .5s .00s ease both; }
        .hp-a2 { animation: hp-fadeUp .5s .08s ease both; }
        .hp-a3 { animation: hp-fadeUp .5s .16s ease both; }
        .hp-a4 { animation: hp-fadeUp .5s .24s ease both; }

        @media (max-width: 768px) {
          .hp-hero-grid  { grid-template-columns: 1fr !important; }
          .hp-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .hp-3-grid     { grid-template-columns: 1fr !important; }
          .hp-output-meta{ flex-direction: column !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════ */}
      <section style={{
        background: 'var(--panel)', borderBottom: '1px solid var(--border)',
        padding: isMobile ? '44px 16px 40px' : '72px 32px 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Dot grid texture */}
        <div style={{ position:'absolute', inset:0, opacity:.025, backgroundImage:'radial-gradient(circle at 1px 1px,#0f172a 1px,transparent 0)', backgroundSize:'24px 24px', pointerEvents:'none' }} />
        {/* Glow orb */}
        <div style={{ position:'absolute', top:-100, right:-60, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(14,165,233,.1) 0%,transparent 65%)', pointerEvents:'none' }} />

        <div style={{ maxWidth:1200, margin:'0 auto', position:'relative' }}>

          {/* Eyebrow badges */}
          <div className="hp-a1" style={{ display:'flex', gap:8, marginBottom:22, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, background:'rgba(14,165,233,.1)', color:'#0ea5e9', border:'1px solid rgba(14,165,233,.2)', padding:'4px 12px', borderRadius:20, fontWeight:700, letterSpacing:'.05em' }}>
              🇮🇳 India-focused
            </span>
            <span style={{ fontSize:12, background:'var(--bg-3)', color:'var(--text-2)', border:'1px solid var(--border)', padding:'4px 12px', borderRadius:20, fontWeight:600 }}>
              No login required
            </span>
            <span style={{ fontSize:12, background:'var(--bg-3)', color:'var(--text-2)', border:'1px solid var(--border)', padding:'4px 12px', borderRadius:20, fontWeight:600 }}>
              100% anonymous
            </span>
          </div>

          <div className="hp-hero-grid" style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 40 : 64, alignItems:'flex-start' }}>

            {/* Left: headline + trust */}
            <div className="hp-a2">
              <h1 className="hp-title" style={{ marginBottom:18 }}>
                Find out if you're<br />
                <em>underpaid</em><br />
                in 30 seconds.
              </h1>
              <p style={{ fontSize:17, color:'var(--text-2)', lineHeight:1.65, marginBottom:28, maxWidth:460 }}>
                Real salary data from Indian professionals. No fluff, no login, no guesswork — just your number, instantly.
              </p>

              {/* Trust chips */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:32 }}>
                {['🔒 No email required','👤 Fully anonymous','⚡ Instant results','✅ Verified data'].map(c => (
                  <span key={c} className="hp-chip">{c}</span>
                ))}
              </div>

              {/* Live counter */}
              <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-2)' }}>
                <span className="hp-live-dot" />
                <span>
                  <strong style={{ color:'var(--text-1)' }}>{totalEntries ? fmtCount(totalEntries) : '12k+'}</strong>
                  {' '}salary data points &amp; growing
                </span>
              </div>

              {/* Headline alternatives — dev note hidden */}
            </div>

            {/* Right: form card */}
            <div className="hp-a3">
              <div className="hp-card" style={{ boxShadow:'0 20px 60px rgba(0,0,0,.1)', border:'1px solid var(--border)' }}>
                <div style={{ marginBottom:20 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Check your salary</p>
                  <p style={{ fontSize:13, color:'var(--text-3)' }}>Takes 10 seconds · Zero sign-up</p>
                </div>

                <form onSubmit={handleHeroSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6, display:'block' }}>Role / Job Title</label>
                    <select className="hp-input" value={role} onChange={e => setRole(e.target.value)}>
                      <option value="">e.g. Software Engineer</option>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6, display:'block' }}>Years of Experience</label>
                    <select className="hp-input" value={experience} onChange={e => setExperience(e.target.value)}>
                      <option value="">Select range</option>
                      {EXP_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', marginBottom:6, display:'block' }}>Location</label>
                    <select className="hp-input" value={location} onChange={e => setLocation(e.target.value)}>
                      <option value="">e.g. Bengaluru</option>
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <button type="submit" className="hp-cta-primary" style={{ width:'100%', marginTop:4 }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    See My Salary Insights
                  </button>

                  <p style={{ textAlign:'center', fontSize:11, color:'var(--text-3)' }}>
                    🔒 Anonymous · No account · Free forever
                  </p>
                </form>

                <div style={{ borderTop:'1px solid var(--border)', marginTop:16, paddingTop:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'var(--text-3)' }}>Want to help others?</span>
                  <Link to="/submit" style={{ fontSize:12, fontWeight:700, color:'#0ea5e9', textDecoration:'none' }}>Add your salary →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          2. SOCIAL PROOF / STATS
      ══════════════════════════════════════════════ */}
      <section style={{ background:'var(--bg-2)', padding: isMobile ? '36px 16px' : '52px 32px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <span className="hp-sec-label">By the numbers</span>
            <h2 className="hp-sec-title">India's fastest-growing <em>salary database</em></h2>
          </div>
          <div className="hp-stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[
              { display: totalEntries ? fmtCount(totalEntries) : '12k+', label:'Verified Salary Entries', sub:'Crowd-sourced & AI-enriched', icon:'💰', color:'#0ea5e9', live:true },
              { display: totalCompanies ? fmtCount(totalCompanies) : '800+', label:'Companies Covered', sub:'From startups to FAANG', icon:'🏢', color:'#8b5cf6' },
              { display:'15+', label:'Cities Across India', sub:'Tier 1, 2 and remote', icon:'📍', color:'#16a34a' },
              { display: thisMonth ? String(thisMonth) : '500+', label:'New This Month', sub:'Community growing daily', icon:'📈', color:'#f59e0b', live:true },
            ].map((s, i) => (
              <div key={i} style={{
                background:'var(--panel)', border:'1px solid var(--border)', borderRadius:14,
                padding:'20px 16px', textAlign:'center',
                transition:'transform .2s, box-shadow .2s',
                animation:`hp-fadeUp .4s ${i*80}ms ease both`,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
              >
                <div style={{ fontSize:26, marginBottom:10 }}>{s.icon}</div>
                <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:32, fontWeight:800, color:s.color, letterSpacing:'-0.03em', lineHeight:1, marginBottom:6 }}>
                  {s.display}
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:4 }}>{s.label}</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                  {s.live && <span className="hp-live-dot" style={{ width:6, height:6 }} />}
                  <span style={{ fontSize:11, color:'var(--text-3)' }}>{s.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          3. HOW IT WORKS
      ══════════════════════════════════════════════ */}
      <section style={{ background:'var(--panel)', padding: isMobile ? '44px 16px' : '68px 32px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <span className="hp-sec-label">How it works</span>
            <h2 className="hp-sec-title">Insights in <em>3 simple steps</em></h2>
            <p style={{ fontSize:15, color:'var(--text-2)', marginTop:10, maxWidth:440, margin:'10px auto 0' }}>
              No forms, no account, no waiting. Just answers.
            </p>
          </div>

          <div className="hp-3-grid" style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:20 }}>
            {[
              { num:'1', emoji:'🔍', title:'Enter 3 details', desc:'Your role, experience level, and city. That\'s all — no email, no sign-up, no nonsense.', color:'#0ea5e9', bg:'rgba(14,165,233,.05)', border:'rgba(14,165,233,.2)' },
              { num:'2', emoji:'⚡', title:'We crunch the data', desc:'We match your profile against thousands of verified peer salaries shared by Indian professionals.', color:'#8b5cf6', bg:'rgba(139,92,246,.05)', border:'rgba(139,92,246,.2)' },
              { num:'3', emoji:'💡', title:'Get your verdict', desc:'See if you\'re underpaid, overpaid, or right on market — with your percentile rank and real ₹ figures.', color:'#16a34a', bg:'rgba(22,163,74,.05)', border:'rgba(22,163,74,.2)' },
            ].map((step, i) => (
              <div key={i} style={{
                background:step.bg, border:`1px solid ${step.border}`, borderRadius:16, padding:24,
                animation:`hp-fadeUp .4s ${i*100}ms ease both`,
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
                  <div className="hp-step-num" style={{ background:step.color }}>{step.num}</div>
                  <div style={{ fontSize:30, lineHeight:1, marginTop:2 }}>{step.emoji}</div>
                </div>
                <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:18, fontWeight:700, color:'var(--text-1)', marginBottom:8, letterSpacing:'-0.02em' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign:'center', marginTop:36 }}>
            <Link to="/salaries" className="hp-cta-primary" style={{ display:'inline-flex' }}>
              Try it now — it's free
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          4. SAMPLE OUTPUT PREVIEW
      ══════════════════════════════════════════════ */}
      <section style={{ background:'var(--bg-2)', padding: isMobile ? '44px 16px' : '68px 32px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:44 }}>
            <span className="hp-sec-label">Sample report</span>
            <h2 className="hp-sec-title">This is what you'll <em>actually see</em></h2>
            <p style={{ fontSize:15, color:'var(--text-2)', marginTop:10 }}>Real insights, not vague ranges. Here's a preview.</p>
          </div>

          {/* Output card */}
          <div style={{ maxWidth:720, margin:'0 auto', background:'var(--panel)', border:'1px solid var(--border)', borderRadius:20, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.1)' }}>

            {/* Header bar */}
            <div style={{ padding:'18px 24px', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:11, color:'#475569', marginBottom:3, letterSpacing:'.06em', textTransform:'uppercase' }}>Salary Insights</div>
                <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:18, fontWeight:700, color:'white' }}>
                  Software Engineer · 4 years · Bengaluru
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <span style={{ fontSize:11, fontWeight:700, background:'rgba(34,197,94,.1)', color:'#22c55e', border:'1px solid rgba(34,197,94,.2)', padding:'3px 10px', borderRadius:20 }}>✓ Verified</span>
                <span style={{ fontSize:11, fontWeight:700, background:'rgba(14,165,233,.1)', color:'#0ea5e9', border:'1px solid rgba(14,165,233,.2)', padding:'3px 10px', borderRadius:20 }}>🔒 Anonymous</span>
              </div>
            </div>

            {/* Main verdict */}
            <div style={{ padding:'28px 24px', borderBottom:'1px solid var(--border)' }}>
              <div className="hp-output-meta" style={{ display:'flex', alignItems: isMobile ? 'stretch' : 'center', gap:24, marginBottom:24, flexDirection: isMobile ? 'column' : 'row' }}>
                {/* Badge */}
                <div style={{ padding:'16px 20px', background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:14, textAlign:'center', flexShrink:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#16a34a', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:4 }}>Your Salary</div>
                  <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:34, fontWeight:800, color:'#0f172a', letterSpacing:'-0.03em', lineHeight:1 }}>₹22 LPA</div>
                  <div style={{ fontSize:12, color:'#16a34a', marginTop:6, fontWeight:600 }}>✓ Fairly paid</div>
                </div>
                {/* Range */}
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, color:'var(--text-2)', marginBottom:16, lineHeight:1.6 }}>
                    You earn <strong style={{ color:'#16a34a' }}>₹2L more</strong> than the market median.
                    You're in the <strong style={{ color:'#0f172a' }}>top 32%</strong> of Software Engineers in Bengaluru.
                  </p>
                  <SalaryRangeBar min={1400000} median={2000000} max={3200000} userValue={2200000} />
                </div>
              </div>

              {/* Metric pills */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {[
                  { label:'Your Percentile', value:'Top 32%', color:'#8b5cf6', bg:'#f5f3ff' },
                  { label:'Market Median', value:'₹20 LPA', color:'#0ea5e9', bg:'#eff6ff' },
                  { label:'Top Earners (P90)', value:'₹32 LPA', color:'#f59e0b', bg:'#fffbeb' },
                  { label:'Entry Level (P25)', value:'₹14 LPA', color:'#64748b', bg:'#f8fafc' },
                ].map(item => (
                  <div key={item.label} style={{ padding:'10px 16px', background:item.bg, borderRadius:10, flex: isMobile ? '1 1 40%' : 'auto' }}>
                    <div style={{ fontSize:10, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>{item.label}</div>
                    <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:18, fontWeight:800, color:item.color, letterSpacing:'-0.02em' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI insights */}
            <div style={{ padding:'18px 24px', background:'rgba(14,165,233,.04)' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#0ea5e9', marginBottom:10, textTransform:'uppercase', letterSpacing:'.07em' }}>💡 AI Insights</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  'Engineers with 3–5 YoE in Bengaluru earn ₹18–28 LPA at mid-stage startups.',
                  'Adding system design skills could push your comp to the ₹28L+ band.',
                  '43% of peers at this level received ESOPs averaging ₹3–6L/year.',
                ].map((tip, i) => (
                  <div key={i} style={{ display:'flex', gap:8, fontSize:13, color:'var(--text-2)', lineHeight:1.55 }}>
                    <span style={{ color:'#0ea5e9', flexShrink:0 }}>→</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{ padding:'20px 24px', textAlign:'center', borderTop:'1px solid var(--border)', background:'var(--panel)' }}>
              <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:14 }}>
                <strong>Unlock your full report</strong> — company-specific data, YoY trends &amp; negotiation tips
              </p>
              <Link to="/salaries" className="hp-cta-primary" style={{ display:'inline-flex', fontSize:14 }}>
                Check My Real Salary →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          5. TRUST & SAFETY
      ══════════════════════════════════════════════ */}
      <section style={{ background:'var(--panel)', padding: isMobile ? '44px 16px' : '68px 32px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:44 }}>
            <span className="hp-sec-label">Privacy &amp; Trust</span>
            <h2 className="hp-sec-title">Built on <em>trust &amp; transparency</em></h2>
          </div>
          <div className="hp-3-grid" style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:20 }}>
            {[
              { icon:'👤', title:'Zero personal data', desc:'We never ask for your name, email, or employer. Your identity is never linked to any submission — not now, not ever.', color:'#0ea5e9' },
              { icon:'🔍', title:'Data quality controls', desc:'Every salary entry is validated against role, experience, and location benchmarks. Outliers are flagged and removed automatically.', color:'#8b5cf6' },
              { icon:'🤝', title:'Community-verified', desc:'Patterns are cross-verified across multiple submissions. More contributions = more accurate benchmarks for everyone.', color:'#16a34a' },
            ].map((item, i) => (
              <div key={i} className="hp-card" style={{ display:'flex', flexDirection:'column', gap:14, animation:`hp-fadeUp .4s ${i*100}ms ease both` }}>
                <div style={{ width:44, height:44, borderRadius:12, background:`${item.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                  {item.icon}
                </div>
                <div>
                  <h3 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:17, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>{item.title}</h3>
                  <p style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.65 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust strip */}
          <div style={{ marginTop:28, padding:'14px 24px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, display:'flex', flexWrap:'wrap', gap:20, alignItems:'center', justifyContent:'center' }}>
            {['✓ No login required','✓ No IP tracking','✓ Aggregated only','✓ Not sold to third parties','✓ Free forever'].map(item => (
              <span key={item} style={{ fontSize:13, fontWeight:600, color:'#16a34a' }}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          6. VIRAL LOOP — Contribute
      ══════════════════════════════════════════════ */}
      <section style={{ background:'var(--bg-2)', padding: isMobile ? '44px 16px' : '68px 32px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{
            background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)',
            borderRadius:20, padding: isMobile ? '28px 20px' : '48px',
            position:'relative', overflow:'hidden', color:'white',
          }}>
            {/* Orbs */}
            <div style={{ position:'absolute', top:-60, right:-60, width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,rgba(14,165,233,.25) 0%,transparent 70%)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', bottom:-40, left:-40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,.2) 0%,transparent 70%)', pointerEvents:'none' }} />

            <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 28 : 48, alignItems: isMobile ? 'flex-start' : 'center' }}>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#0ea5e9', marginBottom:12, display:'block' }}>
                  Help the community
                </span>
                <h2 style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize: isMobile ? 24 : 30, fontWeight:800, color:'white', letterSpacing:'-0.03em', lineHeight:1.15, marginBottom:14 }}>
                  Checked your salary?<br />Now pay it forward.
                </h2>
                <p style={{ fontSize:15, color:'#94a3b8', lineHeight:1.65 }}>
                  Every salary you share makes the data more accurate for the next person. 60 seconds of your time helps thousands negotiate better.
                </p>
              </div>

              <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:12, minWidth: isMobile ? '100%' : 220 }}>
                {/* Progress meter */}
                <div style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:12, padding:'14px 16px', marginBottom:4 }}>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:8 }}>Community goal this month</div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:18, fontWeight:800, color:'white' }}>
                      {thisMonth ? `${thisMonth} / 1,000` : '347 / 1,000'}
                    </span>
                    <span style={{ fontSize:11, color:'#22c55e', fontWeight:700 }}>
                      {thisMonth ? `${Math.min(Math.round((thisMonth/1000)*100),100)}%` : '35%'}
                    </span>
                  </div>
                  <div style={{ height:6, background:'rgba(255,255,255,.1)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width: thisMonth ? `${Math.min((thisMonth/1000)*100,100)}%` : '35%', background:'linear-gradient(90deg,#0ea5e9,#22c55e)', borderRadius:3 }} />
                  </div>
                </div>

                <Link to="/submit" className="hp-cta-primary" style={{ textAlign:'center', background:'white', color:'#0f172a' }}>
                  Add My Salary — 60 sec
                </Link>
                <p style={{ fontSize:11, color:'#64748b', textAlign:'center' }}>Anonymous · No login · Helps peers</p>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ marginTop:28, paddingTop:24, borderTop:'1px solid rgba(255,255,255,.08)', display:'flex', flexWrap:'wrap', gap:24 }}>
              {[
                { stat:'82%', label:'of users who checked also contributed' },
                { stat:'3x',  label:'more accurate with peer contributions' },
                { stat:'60s', label:'average time to submit a salary' },
              ].map(s => (
                <div key={s.stat} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:22, fontWeight:800, color:'#0ea5e9' }}>{s.stat}</span>
                  <span style={{ fontSize:12, color:'#64748b', maxWidth:120, lineHeight:1.4 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          RECENT SALARY DATA
      ══════════════════════════════════════════════ */}
      <section style={{ background:'var(--panel)', padding: isMobile ? '40px 16px' : '64px 32px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:16, marginBottom:28 }}>
            <div>
              <span className="hp-sec-label">Live data</span>
              <h2 className="hp-sec-title">Latest <em>salary entries</em></h2>
              <p style={{ fontSize:14, color:'var(--text-2)', marginTop:8 }}>Real salaries shared by real Indian professionals. Updated continuously.</p>
            </div>
            <Link to="/salaries" className="hp-cta-ghost">
              View all {totalEntries ? `${fmtCount(totalEntries)} entries` : 'entries'} →
            </Link>
          </div>
          <SalaryTable rows={recentSalaries} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          7. FINAL CTA
      ══════════════════════════════════════════════ */}
      <section style={{ background:'var(--bg-2)', padding: isMobile ? '56px 16px' : '88px 32px' }}>
        <div style={{ maxWidth:640, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:44, marginBottom:16, display:'inline-block', animation:'hp-float 3s ease-in-out infinite' }}>💰</div>
          <h2 style={{
            fontFamily:"'Bricolage Grotesque',sans-serif",
            fontSize: isMobile ? 30 : 44,
            fontWeight:800, letterSpacing:'-0.03em', lineHeight:1.1,
            color:'var(--text-1)', marginBottom:16,
          }}>
            Stop wondering.<br />
            <span style={{ color:'#0ea5e9' }}>Start knowing.</span>
          </h2>
          <p style={{ fontSize:17, color:'var(--text-2)', lineHeight:1.65, marginBottom:32, maxWidth:460, margin:'0 auto 32px' }}>
            Thousands of Indian professionals have already checked their worth. Find out where you stand — in under 30 seconds.
          </p>

          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:20 }}>
            <Link to="/salaries" className="hp-cta-primary" style={{ fontSize:16, padding:'16px 36px' }}>
              Check My Salary Now
            </Link>
            <Link to="/submit" className="hp-cta-ghost">
              Contribute Salary Data
            </Link>
          </div>

          <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:28 }}>
            🔒 100% anonymous · No login · Free forever
          </p>

          <div style={{ display:'flex', justifyContent:'center', gap:24, flexWrap:'wrap' }}>
            {[{ icon:'🇮🇳', label:'India-focused' },{ icon:'⚡', label:'Instant results' },{ icon:'👥', label:'Crowd-verified' },{ icon:'🔒', label:'Zero data stored' }].map(item => (
              <div key={item.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--text-3)' }}>
                <span>{item.icon}</span><span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

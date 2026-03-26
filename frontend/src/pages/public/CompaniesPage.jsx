import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import ScrollableSelect from '../../components/shared/ScrollableSelect';

const VIZ_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#6366f1','#a78bfa','#818cf8'];
const SEARCH_MIN_CHARS = 3;
const SEARCH_DEBOUNCE  = 600;
const PAGE_SIZE        = 10;
const BENEFITS_PREVIEW = 3;

function fmtSalary(val) {
  if (!val && val !== 0) return '—';
  const l = Number(val) / 100000;
  return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const h     = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  const months= Math.floor(diff / 2592000000);
  if (h < 1)    return 'just now';
  if (h < 24)   return `${h}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4)return `${weeks}w ago`;
  return `${months}mo ago`;
}

function mapSalary(s) {
  const levelMap = { INTERN:'junior',ENTRY:'junior',MID:'mid',SENIOR:'senior',LEAD:'lead',MANAGER:'lead',DIRECTOR:'lead',VP:'lead',C_LEVEL:'lead' };
  const fmt = (v) => { if (!v && v !== 0) return '—'; const l = Number(v)/100000; return l>=100?`₹${(l/100).toFixed(1)}Cr`:`₹${l.toFixed(1)}L`; };
  return {
    id: s.id, role: s.jobTitle ?? '—',
    level: levelMap[s.experienceLevel] ?? 'mid',
    internalLevel: s.standardizedLevelName ?? '—',
    location: s.location ?? '—',
    base: fmt(s.baseSalary), bonus: fmt(s.bonus),
    equity: fmt(s.equity), tc: fmt(s.totalCompensation),
    yoe: s.yearsOfExperience != null ? `${s.yearsOfExperience} yr` : '—',
    recordedAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—',
  };
}

// ── Benefits helpers ─────────────────────────────────────────────────────────

const BENEFIT_ICON_MAP = {
  // Financial
  'esop': '💰', 'stock': '💰', 'equity': '💰',
  'meal': '🍱', 'food': '🍱', 'lunch': '🍱',
  'relocation': '📦', 'moving': '📦',
  'bonus': '💵', 'incentive': '💵',
  // Health
  'health': '🏥', 'medical': '🏥', 'hospitalization': '🏥',
  'dental': '🦷', 'vision': '👁️', 'optical': '👁️',
  'gym': '💪', 'wellness': '💪', 'fitness': '💪',
  'mental': '🧠',
  // Growth
  'learning': '📚', 'education': '📚', 'course': '📚', 'conference': '📚', 'training': '📚',
  'certification': '🎓',
  // Lifestyle
  'wfh': '🏠', 'remote': '🏠', 'work from home': '🏠',
  'parental': '👶', 'maternity': '👶', 'paternity': '👶',
  'leave': '🌴', 'sabbatical': '🌴', 'pto': '🌴',
  'commute': '🚌', 'transport': '🚌',
};

const BENEFIT_CATEGORY_MAP = {
  financial: ['esop', 'stock', 'equity', 'meal', 'food', 'lunch', 'relocation', 'moving', 'bonus', 'incentive', 'allowance'],
  health:    ['health', 'medical', 'hospitalization', 'dental', 'vision', 'optical', 'gym', 'wellness', 'fitness', 'mental'],
  growth:    ['learning', 'education', 'course', 'conference', 'training', 'certification', 'budget'],
  lifestyle: ['wfh', 'remote', 'work from home', 'parental', 'maternity', 'paternity', 'leave', 'sabbatical', 'pto', 'commute', 'transport'],
};

const CATEGORY_META = {
  financial: { label: 'Financial', dot: '#639922', iconBg: 'rgba(99,153,34,0.12)'  },
  health:    { label: 'Health',    dot: '#E24B4A', iconBg: 'rgba(226,75,74,0.1)'   },
  growth:    { label: 'Growth',    dot: '#378ADD', iconBg: 'rgba(55,138,221,0.1)'  },
  lifestyle: { label: 'Lifestyle', dot: '#BA7517', iconBg: 'rgba(186,117,23,0.1)'  },
  other:     { label: 'Other',     dot: '#888780', iconBg: 'rgba(136,135,128,0.1)' },
};

function detectCategory(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(BENEFIT_CATEGORY_MAP)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'other';
}

function detectIcon(name) {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(BENEFIT_ICON_MAP)) {
    if (lower.includes(keyword)) return icon;
  }
  return '✦';
}

function BenefitsGrid({ benefits }) {
  if (!benefits || benefits.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:13, fontStyle:'italic' }}>
        No benefits information added yet.
      </div>
    );
  }

  // Normalise + group
  const normalised = benefits.map(b => ({
    name:   typeof b === 'string' ? b : b.name,
    amount: typeof b === 'string' ? null : b.amount,
  }));

  const groups = {};
  normalised.forEach(b => {
    const cat = detectCategory(b.name);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(b);
  });

  // Render in fixed order: financial → health → growth → lifestyle → other
  const ORDER = ['financial', 'health', 'growth', 'lifestyle', 'other'];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {ORDER.filter(cat => groups[cat]).map(cat => {
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat}>
            {/* Category header */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:meta.dot, flexShrink:0 }} />
              <span style={{ fontSize:10, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-3)' }}>
                {meta.label}
              </span>
              <div style={{ flex:1, height:'0.5px', background:'var(--border)' }} />
            </div>

            {/* 3-col tile grid */}
            <div className="grid-benefits-3">
              {groups[cat].map((b, i) => (
                <div key={i} style={{ background:'var(--bg-2)', borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:meta.iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                    {detectIcon(b.name)}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {b.name}
                    </div>
                    {b.amount
                      ? <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', fontFamily:"'IBM Plex Mono',monospace" }}>{b.amount}</div>
                      : <div style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>not specified</div>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Company Detail Modal ──────────────────────────────────────────────────────
function CompanyModal({ company, initialTab = 'levels', onClose }) {
  const [tab,           setTab]          = useState(initialTab);
  const [salaries,      setSalaries]     = useState([]);
  const [levels,        setLevels]       = useState(null);
  const [loadingEnt,    setLoadingEnt]   = useState(false);
  const [loadingLvl,    setLoadingLvl]   = useState(true);
  const [page,          setPage]         = useState(0);
  const [totalPages,    setTotalPages]   = useState(1);
  const [totalElements, setTotalElements]= useState(0);
  // Server-side filter + sort state
  const [filterLevel,    setFilterLevel]    = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [sortBy,         setSortBy]         = useState('totalCompensation');

  // Unique level/location options derived from already-loaded level data + company entries
  const levelOptions    = levels ? levels.map(l => l.internalLevel).filter(Boolean) : [];
  const locationOptions = ['BENGALURU','HYDERABAD','PUNE','DELHI_NCR','MUMBAI','CHENNAI','KOLKATA','REMOTE'];
  const locationLabels  = { BENGALURU:'Bengaluru', HYDERABAD:'Hyderabad', PUNE:'Pune', DELHI_NCR:'Delhi NCR', MUMBAI:'Mumbai', CHENNAI:'Chennai', KOLKATA:'Kolkata', REMOTE:'Remote' };

  // Badge colour per internal level
  const LEVEL_BADGE = {
    SDE_1:                { bg:'#E1F5EE', color:'#0F6E56', darkBg:'#085041', darkColor:'#9FE1CB' },
    SDE_2:                { bg:'#E6F1FB', color:'#185FA5', darkBg:'#0C447C', darkColor:'#B5D4F4' },
    SDE_3:                { bg:'#EEEDFE', color:'#534AB7', darkBg:'#3C3489', darkColor:'#CECBF6' },
    STAFF_ENGINEER:       { bg:'#EEEDFE', color:'#534AB7', darkBg:'#3C3489', darkColor:'#CECBF6' },
    PRINCIPAL_ENGINEER:   { bg:'#FAEEDA', color:'#854F0B', darkBg:'#633806', darkColor:'#FAC775' },
    ARCHITECT:            { bg:'#FAEEDA', color:'#854F0B', darkBg:'#633806', darkColor:'#FAC775' },
    ENGINEERING_MANAGER:  { bg:'#FCEBEB', color:'#A32D2D', darkBg:'#791F1F', darkColor:'#F7C1C1' },
    SR_ENGINEERING_MANAGER:{ bg:'#FCEBEB', color:'#A32D2D', darkBg:'#791F1F', darkColor:'#F7C1C1' },
    DIRECTOR:             { bg:'#FCEBEB', color:'#A32D2D', darkBg:'#791F1F', darkColor:'#F7C1C1' },
    SR_DIRECTOR:          { bg:'#FCEBEB', color:'#A32D2D', darkBg:'#791F1F', darkColor:'#F7C1C1' },
    VP:                   { bg:'#F1EFE8', color:'#5F5E5A', darkBg:'#444441', darkColor:'#D3D1C7' },
  };

  function getLevelBadgeStyle(internalLevelStr) {
    const key = internalLevelStr?.replace(/ /g,'_').toUpperCase();
    const b = LEVEL_BADGE[key];
    if (!b) return { fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:99, background:'var(--bg-2)', color:'var(--text-2)', whiteSpace:'nowrap' };
    return { fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:99, background:b.bg, color:b.color, whiteSpace:'nowrap' };
  }

  const LEVEL_COLORS = { junior:'#06b6d4', mid:'#6366f1', senior:'#3b82f6', lead:'#8b5cf6' };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Load level breakdown on mount
  useEffect(() => {
    setLoadingLvl(true);
    api.get(`/public/companies/${company.id}/salary-summary`)
      .then(r => setLevels(r.data?.data?.levels ?? []))
      .catch(() => setLevels([]))
      .finally(() => setLoadingLvl(false));
  }, [company.id]);

  // Load salary entries — re-fetches on filter/sort/page change
  useEffect(() => {
    if (tab !== 'entries') return;
    setLoadingEnt(true);
    const params = { page, size: 10, sortBy };
    if (filterLevel)    params.level    = filterLevel;
    if (filterLocation) params.location = filterLocation;
    api.get(`/public/companies/${company.id}/salaries`, { params })
      .then(r => {
        const paged = r.data?.data;
        setSalaries((paged?.content ?? []).map(mapSalary));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoadingEnt(false));
  }, [company.id, tab, page, filterLevel, filterLocation, sortBy]);

  // Reset to page 0 when filters/sort change
  function applyFilter(setter, value) { setter(value); setPage(0); }

  const maxTC = levels ? Math.max(...levels.map(l => l.avgTC ?? 0), 1) : 1;
  const hasTcRange = company.tcMin != null && company.tcMax != null;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', zIndex:300 }} />
      <div className="company-modal-root" style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        zIndex:301, width:'min(860px, 94vw)', maxHeight:'88vh',
        background:'var(--panel)', border:'1px solid var(--border)',
        borderRadius:20, overflow:'hidden', display:'flex', flexDirection:'column',
      }}>

        {/* Header */}
        <div style={{ padding:'24px 28px 0', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              <CompanyLogo
                companyId={company.id}
                companyName={company.name}
                logoUrl={company.logoUrl}
                website={company.website}
                size={46}
                radius={12}
              />
              <div>
                <div style={{ fontSize:18, fontWeight:600, color:'var(--text-1)' }}>{company.name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
                  {company.industry}{company.website ? ` · ${company.website.replace(/^https?:\/\//, '')}` : ''}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:8, width:30, height:30, cursor:'pointer', color:'var(--text-2)', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
          </div>

          {/* Stat bar — single surface with internal dividers */}
          <div className="company-modal-statbar" style={{ display:'flex', background:'var(--bg-2)', borderRadius:10, marginBottom:18, overflow:'hidden' }}>
            {[
              { label:'Entries',  value: company.entries,  accent: false },
              { label:'Median Base', value: company.avgBase,  accent: false },
              { label:'Median TC',   value: company.avgTC,    accent: false },
              { label:'TC Range', value: hasTcRange ? `${fmtSalary(company.tcMin)} – ${fmtSalary(company.tcMax)}` : '—', accent: true },
            ].map((s, i) => (
              <div key={s.label} style={{
                display:'flex', flexDirection:'column', padding:'10px 16px',
                borderLeft: i === 0 ? 'none' : '0.5px solid var(--border)',
                flex: i === 3 ? '1.5' : '1',
              }}>
                <div style={{ fontSize:9, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:15, fontWeight:500, fontFamily:"'IBM Plex Mono',monospace", color: s.accent ? '#3b82f6' : 'var(--text-1)', whiteSpace:'nowrap' }}>
                  {s.value ?? '—'}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex' }}>
            {[
              { id:'levels',   label:'TC by level' },
              { id:'entries',  label:'All entries' },
              { id:'benefits', label:'Benefits' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(0); }}
                style={{
                  padding:'9px 18px', fontSize:13, fontWeight:500,
                  color: tab === t.id ? '#3b82f6' : 'var(--text-3)',
                  background:'none', border:'none', cursor:'pointer',
                  borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
                  marginBottom:'-1px', transition:'color 0.15s',
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', flex:1, padding:'20px 28px 28px' }}>

          {/* TC by level */}
          {tab === 'levels' && (
            <>
              {loadingLvl && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:14 }}>
                  <div style={{
                    width:28, height:28, borderRadius:'50%',
                    border:'2.5px solid var(--border)',
                    borderTopColor:'#3b82f6',
                    animation:'lvlSpin 0.7s linear infinite',
                  }} />
                  <span style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>Loading breakdown…</span>
                  <style>{`@keyframes lvlSpin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              {!loadingLvl && levels && levels.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:13, fontStyle:'italic' }}>
                  No level breakdown available yet.
                </div>
              )}
              {!loadingLvl && levels && levels.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6 }}>
                    Median TC per internal level · {company.entries} approved {company.entries === 1 ? 'entry' : 'entries'}
                  </div>
                  {levels.map(l => {
                    const pct = Math.round(((l.avgTC ?? 0) / maxTC) * 100);
                    const basePct  = l.avgBase  ? Math.round((l.avgBase  / (l.avgTC ?? 1)) * 100) : null;
                    const bonusPct = l.avgBonus ? Math.round((l.avgBonus / (l.avgTC ?? 1)) * 100) : null;
                    const equityPct= l.avgEquity? Math.round((l.avgEquity/ (l.avgTC ?? 1)) * 100) : null;
                    return (
                      <div key={l.internalLevel} style={{ marginBottom:4 }}>
                        {/* Bar row — label always in fixed column, never inside/overlapping the bar */}
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:12, color:'var(--text-2)', width:120, flexShrink:0 }}>{l.internalLevel}</span>
                          {/* Track — overflow:hidden safe since label is outside */}
                          <div style={{ flex:1, height:22, background:'var(--bg-2)', borderRadius:6, overflow:'hidden' }}>
                            <div style={{
                              height:'100%', width:`${pct}%`,
                              background:'linear-gradient(90deg,#1e40af,#3b82f6)',
                              borderRadius:6, transition:'width 0.4s ease',
                            }} />
                          </div>
                          {/* TC value — always in its own fixed column, never inside bar */}
                          <span style={{ fontSize:11, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-1)', minWidth:56, textAlign:'right', flexShrink:0 }}>
                            {fmtSalary(l.avgTC)}
                          </span>
                          <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", minWidth:48, textAlign:'right', flexShrink:0 }}>
                            {l.count != null ? `${l.count} entr${l.count === 1 ? 'y' : 'ies'}` : ''}
                          </span>
                        </div>
                        {/* Base + Bonus + RSU breakdown */}
                        {(basePct || bonusPct || equityPct) && (
                          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4 }}>
                            <span style={{ width:120, flexShrink:0 }} />
                            <div style={{ flex:1, display:'flex', gap:12 }}>
                              {l.avgBase && (
                                <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
                                  Base <span style={{ color:'var(--text-2)', fontWeight:500 }}>{fmtSalary(l.avgBase)}</span>
                                </span>
                              )}
                              {l.avgBonus && (
                                <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
                                  Bonus <span style={{ color:'var(--text-2)', fontWeight:500 }}>{fmtSalary(l.avgBonus)}</span>
                                </span>
                              )}
                              {l.avgEquity && (
                                <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
                                  RSU <span style={{ color:'var(--text-2)', fontWeight:500 }}>{fmtSalary(l.avgEquity)}</span>
                                </span>
                              )}
                            </div>
                            <span style={{ minWidth:48, flexShrink:0 }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* All entries */}
          {tab === 'entries' && (
            <>
              {/* Filter + sort bar */}
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
                <select
                  value={filterLevel}
                  onChange={e => applyFilter(setFilterLevel, e.target.value)}
                  style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:'0.5px solid var(--border)', background:'var(--bg-2)', color:'var(--text-2)', cursor:'pointer' }}
                >
                  <option value="">All levels</option>
                  {levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select
                  value={filterLocation}
                  onChange={e => applyFilter(setFilterLocation, e.target.value)}
                  style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:'0.5px solid var(--border)', background:'var(--bg-2)', color:'var(--text-2)', cursor:'pointer' }}
                >
                  <option value="">All locations</option>
                  {locationOptions.map(l => <option key={l} value={l}>{locationLabels[l] ?? l}</option>)}
                </select>
                {/* Active filter chips */}
                {filterLevel && (
                  <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, padding:'3px 8px 3px 10px', borderRadius:99, background:'#E6F1FB', color:'#185FA5', border:'0.5px solid #B5D4F4' }}>
                    {filterLevel}
                    <span onClick={() => applyFilter(setFilterLevel, '')} style={{ cursor:'pointer', fontSize:13, opacity:0.7, lineHeight:1 }}>×</span>
                  </span>
                )}
                {filterLocation && (
                  <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, padding:'3px 8px 3px 10px', borderRadius:99, background:'#E6F1FB', color:'#185FA5', border:'0.5px solid #B5D4F4' }}>
                    {locationLabels[filterLocation] ?? filterLocation}
                    <span onClick={() => applyFilter(setFilterLocation, '')} style={{ cursor:'pointer', fontSize:13, opacity:0.7, lineHeight:1 }}>×</span>
                  </span>
                )}
                <select
                  value={sortBy}
                  onChange={e => applyFilter(setSortBy, e.target.value)}
                  style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:'0.5px solid var(--border)', background:'var(--bg-2)', color:'var(--text-2)', cursor:'pointer', marginLeft:'auto' }}
                >
                  <option value="totalCompensation">Sort: TC ↓</option>
                  <option value="baseSalary">Sort: Base ↓</option>
                  <option value="createdAt">Sort: Date ↓</option>
                </select>
              </div>

              {/* Spinner */}
              {loadingEnt ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:14 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', border:'2.5px solid var(--border)', borderTopColor:'#3b82f6', animation:'lvlSpin 0.7s linear infinite' }} />
                  <span style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>Loading entries…</span>
                </div>
              ) : (
                <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", marginBottom:12 }}>
                  {`Showing ${Math.min(page*10+1, totalElements)}–${Math.min((page+1)*10, totalElements)} of ${totalElements} entr${totalElements !== 1 ? 'ies' : 'y'}`}
                </div>
              )}

              {!loadingEnt && salaries.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:13, fontStyle:'italic' }}>
                  No entries found{filterLevel || filterLocation ? ' for the selected filters' : ''}.
                </div>
              )}

              {!loadingEnt && salaries.length > 0 && (
                <>
                  <div className="salary-table-wrap">
                    <table className="salary-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Level</th>
                          <th>Location</th>
                          <th>Exp</th>
                          <th>Base</th>
                          <th>Bonus</th>
                          <th>RSU</th>
                          <th>Total TC</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaries.map(s => (
                          <tr key={s.id}>
                            <td>
                              <div style={{ fontSize:13, fontWeight:500, color:'var(--text-1)' }}>{s.role}</div>
                              <div style={{ fontSize:11, color:'var(--text-3)' }}>{s.empType?.replace('_',' ').toLowerCase()}</div>
                            </td>
                            <td>
                              <span style={getLevelBadgeStyle(s.internalLevel !== '—' ? s.internalLevel : null)}>
                                {s.internalLevel !== '—' ? s.internalLevel : s.level}
                              </span>
                            </td>
                            <td style={{ fontSize:12, color:'var(--text-2)' }}>{s.location}</td>
                            <td style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>{s.yoe}</td>
                            <td style={{ fontSize:13, fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-1)', fontWeight:500 }}>{s.base}</td>
                            <td style={{ fontSize:12, color:'var(--text-2)', fontFamily:"'IBM Plex Mono',monospace" }}>{s.bonus}</td>
                            <td style={{ fontSize:12, color:'var(--text-2)', fontFamily:"'IBM Plex Mono',monospace" }}>{s.equity}</td>
                            <td style={{ fontSize:14, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-1)', whiteSpace:'nowrap' }}>{s.tc}</td>
                            <td style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", whiteSpace:'nowrap' }}>{s.recordedAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination — smart ellipsis */}
                  {totalPages > 1 && (() => {
                    const delta = 2;
                    const pages = [];
                    const left  = Math.max(0, page - delta);
                    const right = Math.min(totalPages - 1, page + delta);
                    if (left > 0) pages.push({ type:'num', n:0 });
                    if (left > 1) pages.push({ type:'ellipsis', key:'l' });
                    for (let i = left; i <= right; i++) pages.push({ type:'num', n:i });
                    if (right < totalPages - 2) pages.push({ type:'ellipsis', key:'r' });
                    if (right < totalPages - 1) pages.push({ type:'num', n:totalPages-1 });
                    return (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:14, paddingTop:12, borderTop:'0.5px solid var(--border)' }}>
                        <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
                          Page {page+1} of {totalPages}
                        </span>
                        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                          <button className="page-btn" disabled={page===0} onClick={() => setPage(0)} title="First">«</button>
                          <button className="page-btn" disabled={page===0} onClick={() => setPage(p=>p-1)}>←</button>
                          {pages.map((p,i) => p.type === 'ellipsis'
                            ? <span key={p.key} style={{ fontSize:12, color:'var(--text-3)', padding:'0 4px' }}>…</span>
                            : <button key={p.n} className={`page-btn${p.n===page?' active':''}`} onClick={() => setPage(p.n)}>{p.n+1}</button>
                          )}
                          <button className="page-btn" disabled={page===totalPages-1} onClick={() => setPage(p=>p+1)}>→</button>
                          <button className="page-btn" disabled={page===totalPages-1} onClick={() => setPage(totalPages-1)} title="Last">»</button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </>
          )}

          {/* Benefits */}
          {tab === 'benefits' && <BenefitsGrid benefits={company.benefits} />}

        </div>
      </div>
    </>
  );
}

// ── Company Card ──────────────────────────────────────────────────────────────
function CompanyCard({ c, onViewDetails, openRoles }) {
  const [expanded,   setExpanded]   = useState(false);
  const [levels,     setLevels]     = useState(null);
  const [loadingLvl, setLoadingLvl] = useState(false);

  const hasTcRange     = c.tcMin != null && c.tcMax != null;
  const tcRangeStr     = hasTcRange ? `${fmtSalary(c.tcMin)} – ${fmtSalary(c.tcMax)}` : c.avgTC !== '—' ? c.avgTC : '—';
  const previewBenefits= (c.benefits ?? []).slice(0, BENEFITS_PREVIEW);
  const extraBenefits  = (c.benefits ?? []).length - BENEFITS_PREVIEW;

  function toggleExpand(e) {
    e.stopPropagation();
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (levels !== null) return;
    setLoadingLvl(true);
    api.get(`/public/companies/${c.id}/salary-summary`)
      .then(r => setLevels(r.data?.data?.levels ?? []))
      .catch(() => setLevels([]))
      .finally(() => setLoadingLvl(false));
  }

  const maxTC = levels ? Math.max(...levels.map(l => l.avgTC ?? 0), 1) : 1;

  return (
    <div
      className="company-card fade-up"
      style={{ cursor:'default', display:'flex', flexDirection:'column', gap:12, transition:'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.18)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
    >
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={40} radius={10} style={{ border:'0.5px solid var(--border)', flexShrink:0 }} />
          <div style={{ paddingTop:2 }}>
            <div className="company-card-name" style={{ marginBottom:0 }}>{c.name}</div>
            <div className="company-card-industry">{c.industry}</div>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0, marginTop:2 }}>
          <span className="entries-badge-mono" style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:"var(--text-3)", background:"var(--bg-2)", padding:"2px 7px", borderRadius:6, border:"1px solid var(--border)", whiteSpace:"nowrap" }}>
            {c.entries} entries
          </span>
          {openRoles > 0 && (
            <Link
              to={`/opportunities?company=${encodeURIComponent(c.name)}`}
              onClick={e => e.stopPropagation()}
              style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, color:"#16a34a", background:"#dcfce7", border:"1px solid #bbf7d0", borderRadius:6, padding:"2px 7px", whiteSpace:"nowrap", textDecoration:"none", cursor:"pointer" }}
            >
              <svg width="6" height="6" viewBox="0 0 8 8" fill="#16a34a"><circle cx="4" cy="4" r="4"/></svg>
              {openRoles} open {openRoles === 1 ? "role" : "roles"}
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          )}
        </div>
      </div>

      <div style={{ height:'0.5px', background:'var(--border)' }} />

      {/* TC range pill — entire block clickable, two-row layout */}
      <button
        onClick={toggleExpand}
        style={{
          display:'flex', flexDirection:'column', gap:5,
          width:'100%', background:'var(--bg-2)', border:'0.5px solid var(--border)',
          borderRadius:10, padding:'10px 14px', cursor:'pointer', textAlign:'left',
          transition:'border-color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        {/* Top row: label */}
        <span style={{ fontSize:9, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-3)' }}>
          {hasTcRange ? 'TC range' : 'Median TC'}
        </span>
        {/* Bottom row: value left, breakdown right — each on own line if narrow */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, flexWrap:'wrap' }}>
          <span className="tc-range-value" style={{ fontSize:13, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-1)', whiteSpace:'nowrap', minWidth:0 }}>
            {tcRangeStr}
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, fontWeight:500, color:'#3b82f6', whiteSpace:'nowrap', flexShrink:0 }}>
            View breakdown
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
              style={{ transition:'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>
      </button>

      {/* Loading shimmer */}
      {loadingLvl && (
        <div style={{ height:3, background:'rgba(59,130,246,0.12)', borderRadius:99, overflow:'hidden', margin:'-4px 0' }}>
          <div style={{ height:'100%', background:'#3b82f6', borderRadius:99, animation:'companyCrawl 1.2s ease-in-out infinite' }} />
        </div>
      )}

      {/* Level breakdown panel */}
      {expanded && levels && levels.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, animation:'companyFadeIn 0.2s ease', background:'var(--bg-2)', borderRadius:8, padding:'10px 12px' }}>
          {levels.map(l => (
            <div key={l.internalLevel} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'var(--text-2)', width:110, flexShrink:0 }}>{l.internalLevel}</span>
              <div style={{ flex:1, height:4, background:'var(--bg-3)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, background:'#3b82f6', width:`${Math.round(((l.avgTC ?? 0) / maxTC) * 100)}%` }} />
              </div>
              <span style={{ fontSize:11, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-1)', minWidth:52, textAlign:'right' }}>
                {fmtSalary(l.avgTC)}
              </span>
            </div>
          ))}
        </div>
      )}
      {expanded && levels && levels.length === 0 && !loadingLvl && (
        <div style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>No level breakdown available yet.</div>
      )}

      <div style={{ height:'0.5px', background:'var(--border)' }} />

      {/* Benefits preview */}
      <div>
        <div style={{ fontSize:10, fontWeight:500, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:6 }}>Benefits</div>
        {previewBenefits.length > 0 ? (
          <div className="benefits-row" style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
            {previewBenefits.map((b, i) => {
              const name = typeof b === 'string' ? b : b.name;
              return (
                <span key={i} style={{ fontSize:10, color:'var(--text-2)', background:'var(--bg-2)', border:'0.5px solid var(--border)', borderRadius:6, padding:'3px 8px', display:'flex', alignItems:'center', gap:4 }}>
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {name}
                </span>
              );
            })}
            {extraBenefits > 0 && (
              <button onClick={e => { e.stopPropagation(); onViewDetails('benefits'); }} style={{ fontSize:10, color:'#3b82f6', fontWeight:500, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                +{extraBenefits} more
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>Not added yet</div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto' }}>
        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'var(--text-3)' }}>Updated {c.updatedLabel}</span>
        <button
          onClick={e => { e.stopPropagation(); onViewDetails('levels'); }}
          style={{ fontSize:11, fontWeight:500, color:'#3b82f6', background:'rgba(59,130,246,0.08)', border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer' }}
        >
          View details →
        </button>
      </div>
    </div>
  );
}

// ── Main CompaniesPage ────────────────────────────────────────────────────────
export default function CompaniesPage() {
  const [items,         setItems]         = useState([]);
  const [industries,    setIndustries]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [inputValue,    setInputValue]    = useState('');
  const [search,        setSearch]        = useState('');
  const [industry,      setIndustry]      = useState('');
  const debounceRef = useRef(null);
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [selected,      setSelected]      = useState(null); // { company, initialTab }
  const [hiringMap,     setHiringMap]     = useState(new Map());

  useEffect(() => {
    api.get("/public/companies/industries")
      .then(r => setIndustries(r.data?.data ?? []))
      .catch(console.error);
    api.get("/public/companies/hiring-now")
      .then(r => {
        const hMap = new Map();
        for (const item of r.data?.data ?? []) {
          if (item.companyId) hMap.set(String(item.companyId), Number(item.openRoles));
        }
        setHiringMap(hMap);
      })
      .catch(() => {});
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function commitSearch(val) { clearTimeout(debounceRef.current); setSearch(val); setPage(0); }

  function handleSearchChange(e) {
    const val = e.target.value;
    setInputValue(val);
    clearTimeout(debounceRef.current);
    if (val.length === 0) { commitSearch(''); return; }
    if (val.length < SEARCH_MIN_CHARS) return;
    debounceRef.current = setTimeout(() => commitSearch(val), SEARCH_DEBOUNCE);
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter' && inputValue.length >= SEARCH_MIN_CHARS) commitSearch(inputValue);
  }

  const fetchCompanies = useCallback(() => {
    setLoading(true); setError(null);
    api.get('/public/companies', { params: { page, size: PAGE_SIZE, ...(search && { name: search }), ...(industry && { industry }) } })
      .then(r => {
        const paged = r.data?.data;
        setItems((paged?.content ?? []).map(c => ({
          id: c.id, name: c.name ?? '—', industry: c.industry ?? '—',
          logoUrl: c.logoUrl ?? null, website: c.website ?? null,
          updatedLabel: fmtDate(c.updatedAt ?? c.createdAt),
          entries: c.entryCount ?? '—',
          avgBase: fmtSalary(c.avgBaseSalary),
          avgTC:   fmtSalary(c.avgTotalCompensation),
          tcMin:   c.tcMin ?? null, tcMax: c.tcMax ?? null,
          benefits: c.benefits ?? [],
          levelCategory: c.companyLevelCategory ?? null,
        })));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(err => setError(`Failed to load companies (${err.response?.status ?? 'network error'})`))
      .finally(() => setLoading(false));
  }, [page, search, industry]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  return (
    <section className="section">
      <style>{`
        @keyframes progressCrawl { 0%{width:0%} 40%{width:65%} 70%{width:82%} 100%{width:90%} }
        @keyframes companyCrawl  { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }
        @keyframes companyFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }

        /* ── Mobile-only card fixes (≤768px) ── */
        @media (max-width: 768px) {
          /* Full-width single column instead of clipped 2-col grid */
          .companies-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          /* Prevent company name + entries badge from overflowing */
          .company-card-name {
            font-size: 14px !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          /* Entries badge: don't let it get clipped */
          .company-card .entries-badge-mono {
            font-size: 10px !important;
            white-space: nowrap !important;
          }
          /* TC range value: allow wrap on very small screens */
          .company-card .tc-range-value {
            font-size: 12px !important;
            white-space: normal !important;
          }
          /* Benefits chips: wrap naturally */
          .company-card .benefits-row {
            flex-wrap: wrap !important;
          }
          /* Modal: full screen on mobile */
          .company-modal-root {
            width: 100vw !important;
            max-width: 100vw !important;
            max-height: 92vh !important;
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            transform: none !important;
            border-radius: 20px 20px 0 0 !important;
          }
          /* Stat bar: 2x2 grid on mobile */
          .company-modal-statbar {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }
          .company-modal-statbar > div {
            border-left: none !important;
            border-top: 0.5px solid var(--border) !important;
          }
          .company-modal-statbar > div:nth-child(odd) {
            border-right: 0.5px solid var(--border) !important;
          }
          .company-modal-statbar > div:nth-child(-n+2) {
            border-top: none !important;
          }
        }
      `}</style>

      <div className="section-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:16, marginBottom:32 }}>
        <div>
          <span className="section-tag">Company Directory</span>
          <h2 className="section-title">Browse <em>Companies</em></h2>
        </div>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:'var(--text-3)', padding:'6px 14px', background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:8 }}>
          {loading ? 'Loading…' : `${totalElements} compan${totalElements !== 1 ? 'ies' : 'y'}`}
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom:32 }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <div className="search-box" style={{ width:'100%' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="input-field" type="text" placeholder="Search companies…" value={inputValue} onChange={handleSearchChange} onKeyDown={handleSearchKeyDown} style={{ paddingRight: inputValue.length >= SEARCH_MIN_CHARS && inputValue !== search ? 68 : 10 }} />
            {inputValue.length >= SEARCH_MIN_CHARS && inputValue !== search && (
              <span onClick={() => commitSearch(inputValue)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:10, color:'#3b82f6', fontFamily:"'IBM Plex Mono',monospace", cursor:'pointer', userSelect:'none', background:'var(--bg-2)', padding:'1px 5px', borderRadius:4, border:'1px solid var(--border)', whiteSpace:'nowrap' }}>↵ Search</span>
            )}
          </div>
          {inputValue.length > 0 && inputValue.length < SEARCH_MIN_CHARS && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
              Type {SEARCH_MIN_CHARS - inputValue.length} more character{SEARCH_MIN_CHARS - inputValue.length !== 1 ? 's' : ''} to search
            </div>
          )}
        </div>
        <ScrollableSelect
          value={industry}
          onChange={v => { setIndustry(v); setPage(0); }}
          options={[{ value: '', label: 'All Industries' }, ...industries.map(i => ({ value: i, label: i }))]}
          placeholder="All Industries"
        />
      </div>

      {loading && (
        <div style={{ padding:'60px 0 58px' }}>
          <div style={{ width:'100%', height:3, background:'var(--bg-3)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius:99, animation:'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
          </div>
        </div>
      )}
      {!loading && error && <div style={{ padding:'16px 20px', background:'var(--rose-dim)', border:'1px solid rgba(224,92,122,0.2)', borderRadius:12, color:'var(--rose)', fontSize:13 }}>{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🔍</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--text-1)', marginBottom:8 }}>No companies found</div>
          <div style={{ fontSize:14, color:'var(--text-3)' }}>Try a different search or clear filters</div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="companies-grid">
            {items.map(c => (
              <CompanyCard key={c.id} c={c} onViewDetails={(initialTab) => setSelected({ company: c, initialTab })} openRoles={hiringMap.get(String(c.id)) ?? 0} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <span className="page-info">Showing {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE, totalElements)} of {totalElements}</span>
              <div className="page-btns">
                <button className="page-btn" disabled={page===0} onClick={() => setPage(p=>p-1)}>←</button>
                {Array.from({ length: totalPages }, (_,i) => i).map(p => (
                  <button key={p} className={`page-btn${p===page?' active':''}`} onClick={() => setPage(p)}>{p+1}</button>
                ))}
                <button className="page-btn" disabled={page===totalPages-1} onClick={() => setPage(p=>p+1)}>→</button>
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <CompanyModal
          company={selected.company}
          initialTab={selected.initialTab}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

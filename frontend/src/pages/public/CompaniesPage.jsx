import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

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
    internalLevel: s.companyInternalLevel ?? s.experienceLevel ?? '—',
    location: s.location ?? '—',
    base: fmt(s.baseSalary), bonus: fmt(s.bonus),
    equity: fmt(s.equity), tc: fmt(s.totalCompensation),
    yoe: s.yearsOfExperience != null ? `${s.yearsOfExperience} yr` : '—',
    recordedAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—',
  };
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

  // Load salary entries when entries tab is active
  useEffect(() => {
    if (tab !== 'entries') return;
    setLoadingEnt(true);
    api.get(`/public/companies/${company.id}/salaries`, { params: { page, size: 10 } })
      .then(r => {
        const paged = r.data?.data;
        setSalaries((paged?.content ?? []).map(mapSalary));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoadingEnt(false));
  }, [company.id, tab, page]);

  const maxTC = levels ? Math.max(...levels.map(l => l.avgTC ?? 0), 1) : 1;
  const hasTcRange = company.tcMin != null && company.tcMax != null;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', zIndex:300 }} />
      <div style={{
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

          {/* Stat chips */}
          <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
            {[
              { label:'Entries',  value: company.entries },
              { label:'Avg Base', value: company.avgBase },
              { label:'Avg TC',   value: company.avgTC },
              { label:'TC Range', value: hasTcRange ? `${fmtSalary(company.tcMin)} – ${fmtSalary(company.tcMax)}` : '—' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:10, padding:'8px 14px' }}>
                <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</div>
                <div style={{ fontSize:15, fontWeight:600, color:'var(--gold)', fontFamily:"'IBM Plex Mono',monospace" }}>{s.value ?? '—'}</div>
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
                <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:8 }}>
                  {[80,60,90,45].map((w,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:100, height:11, borderRadius:4, background:'var(--bg-3)', opacity:0.5 }} />
                      <div style={{ flex:1, height:5, borderRadius:99, background:'var(--bg-3)', opacity:0.4 }} />
                      <div style={{ width:44, height:11, borderRadius:4, background:'var(--bg-3)', opacity:0.5 }} />
                    </div>
                  ))}
                </div>
              )}
              {!loadingLvl && levels && levels.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:13, fontStyle:'italic' }}>
                  No level breakdown available yet.
                </div>
              )}
              {!loadingLvl && levels && levels.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:4 }}>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>
                    Avg TC per internal level · {company.entries} approved {company.entries === 1 ? 'entry' : 'entries'}
                  </div>
                  {levels.map(l => (
                    <div key={l.internalLevel} style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:12, color:'var(--text-2)', width:130, flexShrink:0 }}>{l.internalLevel}</span>
                      <div style={{ flex:1, height:5, background:'var(--bg-3)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:99, background:'#3b82f6', width:`${Math.round(((l.avgTC ?? 0) / maxTC) * 100)}%` }} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-1)', minWidth:52, textAlign:'right' }}>
                        {fmtSalary(l.avgTC)}
                      </span>
                      <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", minWidth:52, textAlign:'right' }}>
                        {l.count != null ? `${l.count} entr${l.count === 1 ? 'y' : 'ies'}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* All entries */}
          {tab === 'entries' && (
            <>
              <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", marginBottom:14 }}>
                {loadingEnt ? 'Loading…' : `${totalElements} approved entr${totalElements !== 1 ? 'ies' : 'y'}`}
              </div>
              {!loadingEnt && salaries.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:13 }}>
                  No approved salary entries for this company yet.
                </div>
              )}
              {!loadingEnt && salaries.length > 0 && (
                <>
                  <div className="salary-table-wrap">
                    <table className="salary-table">
                      <thead>
                        <tr>
                          <th>Role</th><th>Level</th><th>Location</th><th>Exp</th>
                          <th>Base</th><th>Bonus</th><th>Equity</th><th>Total TC</th><th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaries.map(s => (
                          <tr key={s.id}>
                            <td><div className="company-name" style={{ fontSize:13 }}>{s.role}</div></td>
                            <td>
                              <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:6, background:`${LEVEL_COLORS[s.level]}22`, color:LEVEL_COLORS[s.level], fontFamily:"'IBM Plex Mono',monospace", textTransform:'capitalize' }}>
                                {s.internalLevel !== '—' ? s.internalLevel : s.level}
                              </span>
                            </td>
                            <td style={{ fontSize:12, color:'var(--text-2)' }}>{s.location}</td>
                            <td style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>{s.yoe}</td>
                            <td><div className="salary-amount" style={{ fontSize:14 }}>{s.base}</div></td>
                            <td style={{ fontSize:13, color:'var(--text-2)' }}>{s.bonus}</td>
                            <td style={{ fontSize:13, color:'var(--text-2)' }}>{s.equity}</td>
                            <td><div className="salary-amount" style={{ fontSize:15 }}>{s.tc}</div></td>
                            <td style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", whiteSpace:'nowrap' }}>{s.recordedAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="pagination" style={{ marginTop:16 }}>
                      <span className="page-info">{page*10+1}–{Math.min((page+1)*10, totalElements)} of {totalElements}</span>
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
            </>
          )}

          {/* Benefits */}
          {tab === 'benefits' && (
            company.benefits && company.benefits.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column' }}>
                {company.benefits.map((b, i) => (
                  <div key={b} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom: i < company.benefits.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', flexShrink:0 }} />
                      <span style={{ fontSize:13, color:'var(--text-1)' }}>{b}</span>
                    </div>
                    <span style={{ fontSize:12, color:'var(--text-3)', fontStyle:'italic' }}>—</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:13, fontStyle:'italic' }}>
                No benefits information added yet.
              </div>
            )
          )}

        </div>
      </div>
    </>
  );
}

// ── Company Card ──────────────────────────────────────────────────────────────
function CompanyCard({ c, onViewDetails }) {
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
        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'var(--text-3)', background:'var(--bg-2)', padding:'2px 7px', borderRadius:6, border:'1px solid var(--border)', flexShrink:0, marginTop:2 }}>
          {c.entries} entries
        </span>
      </div>

      <div style={{ height:'0.5px', background:'var(--border)' }} />

      {/* TC range + breakdown toggle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div>
          <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:2 }}>{hasTcRange ? 'TC range' : 'Avg TC'}</div>
          <div style={{ fontSize:15, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-1)' }}>{tcRangeStr}</div>
        </div>
        <button
          onClick={toggleExpand}
          style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, color:'#3b82f6', background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}
        >
          Breakdown by level
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ transition:'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

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
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
            {previewBenefits.map(b => (
              <span key={b} style={{ fontSize:10, color:'var(--text-2)', background:'var(--bg-2)', border:'0.5px solid var(--border)', borderRadius:6, padding:'3px 8px', display:'flex', alignItems:'center', gap:4 }}>
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {b}
              </span>
            ))}
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

  useEffect(() => {
    api.get('/public/companies/industries')
      .then(r => setIndustries(r.data?.data ?? []))
      .catch(console.error);
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
        <select className="select-field" value={industry} onChange={e => { setIndustry(e.target.value); setPage(0); }}>
          <option value="">All Industries</option>
          {industries.map(i => <option key={i}>{i}</option>)}
        </select>
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
              <CompanyCard key={c.id} c={c} onViewDetails={(initialTab) => setSelected({ company: c, initialTab })} />
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

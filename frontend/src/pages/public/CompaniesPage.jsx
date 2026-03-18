import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

const PAGE_SIZE = 10;

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
  const h = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  const months = Math.floor(diff / 2592000000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return `${months}mo ago`;
}

function mapSalary(s) {
  const colors = ['#3ecfb0','#d4a853','#e05c7a','#a08ff0','#c07df0','#e89050'];
  const color = colors[s.companyName ? s.companyName.charCodeAt(0) % colors.length : 0];
  const levelMap = { INTERN:'junior',ENTRY:'junior',MID:'mid',SENIOR:'senior',LEAD:'lead',MANAGER:'lead',DIRECTOR:'lead',VP:'lead',C_LEVEL:'lead' };
  const fmt = (v) => { if (!v && v !== 0) return '—'; const l = Number(v)/100000; return l>=100?`₹${(l/100).toFixed(1)}Cr`:`₹${l.toFixed(1)}L`; };
  return {
    id: s.id, role: s.jobTitle ?? '—',
    level: levelMap[s.experienceLevel] ?? 'mid',
    location: s.location ?? '—',
    base: fmt(s.baseSalary), bonus: fmt(s.bonus),
    equity: fmt(s.equity), tc: fmt(s.totalCompensation),
    empType: s.employmentType ?? '—',
    yoe: s.yearsOfExperience != null ? `${s.yearsOfExperience} yr` : '—',
    status: (s.reviewStatus ?? 'APPROVED').toLowerCase(),
    recordedAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—',
  };
}

// ── Company Detail Modal ──────────────────────────────────────────────────────
function CompanyModal({ company, onClose }) {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    api.get(`/public/companies/${company.id}/salaries`, { params: { page, size: 10 } })
      .then(r => {
        const paged = r.data?.data;
        setSalaries((paged?.content ?? []).map(mapSalary));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [company.id, page]);

  const LEVEL_COLORS = { junior: '#3ecfb0', mid: '#d4a853', senior: '#a08ff0', lead: '#e05c7a' };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)', zIndex:300 }} />
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        zIndex:301, width:'min(900px, 94vw)', maxHeight:'85vh',
        background:'var(--panel)', border:'1px solid var(--border)',
        borderRadius:20, overflow:'hidden', display:'flex', flexDirection:'column',
      }}>
        {/* Header */}
        <div style={{ padding:'28px 32px 20px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              <CompanyLogo
                companyId={company.id}
                companyName={company.name}
                logoUrl={company.logoUrl}
                website={company.website}
                size={48}
                radius={12}
              />
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--text-1)', fontWeight:700 }}>{company.name}</div>
                <div style={{ fontSize:13, color:'var(--text-3)', marginTop:2 }}>{company.industry}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:8, width:32, height:32, cursor:'pointer', color:'var(--text-2)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
          </div>

          {/* Stats row */}
          <div style={{ display:'flex', gap:24, marginTop:20, flexWrap:'wrap' }}>
            {[
              { label:'Salary Entries', value: company.entries !== '—' ? company.entries : totalElements },
              { label:'Avg Base',       value: company.avgBase },
              { label:'Avg Total Comp', value: company.avgTC },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--ink-3)', borderRadius:10, padding:'10px 18px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:18, fontWeight:600, color:'var(--gold)', fontFamily:"'JetBrains Mono',monospace" }}>{s.value ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Salary list */}
        <div style={{ overflowY:'auto', flex:1, padding:'20px 32px 28px' }}>
          <div style={{ fontSize:13, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", marginBottom:16 }}>
            {loading ? 'Loading salaries…' : `${totalElements} approved entr${totalElements !== 1 ? 'ies' : 'y'}`}
          </div>

          {!loading && salaries.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:14 }}>
              No approved salary entries for this company yet.
            </div>
          )}

          {!loading && salaries.length > 0 && (
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
                      <th>Equity</th>
                      <th>Total Comp</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaries.map(s => (
                      <tr key={s.id}>
                        <td><div className="company-name" style={{ fontSize:13 }}>{s.role}</div></td>
                        <td>
                          <span style={{
                            fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:6,
                            background:`${LEVEL_COLORS[s.level]}22`, color:LEVEL_COLORS[s.level],
                            fontFamily:"'JetBrains Mono',monospace", textTransform:'capitalize',
                          }}>{s.level}</span>
                        </td>
                        <td style={{ fontSize:12, color:'var(--text-2)' }}>{s.location}</td>
                        <td style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>{s.yoe}</td>
                        <td><div className="salary-amount" style={{ fontSize:14 }}>{s.base}</div></td>
                        <td style={{ fontSize:13, color:'var(--text-2)' }}>{s.bonus}</td>
                        <td style={{ fontSize:13, color:'var(--text-2)' }}>{s.equity}</td>
                        <td><div className="salary-amount" style={{ fontSize:15 }}>{s.tc}</div></td>
                        <td style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", whiteSpace:'nowrap' }}>{s.recordedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination" style={{ marginTop:16 }}>
                  <span className="page-info">{page * 10 + 1}–{Math.min((page+1)*10, totalElements)} of {totalElements}</span>
                  <div className="page-btns">
                    <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p-1)}>←</button>
                    {Array.from({ length: totalPages }, (_, i) => i).map(p => (
                      <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p+1}</button>
                    ))}
                    <button className="page-btn" disabled={page === totalPages-1} onClick={() => setPage(p => p+1)}>→</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main CompaniesPage ────────────────────────────────────────────────────────
export default function CompaniesPage() {
  const [items,         setItems]         = useState([]);
  const [industries,    setIndustries]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState('');
  const [industry,      setIndustry]      = useState('');
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [selected,      setSelected]      = useState(null); // company card for modal

  useEffect(() => {
    api.get('/public/companies/industries')
      .then(r => setIndustries(r.data?.data ?? []))
      .catch(console.error);
  }, []);

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/public/companies', { params: { page, size: PAGE_SIZE, ...(search && { name: search }), ...(industry && { industry }) } })
      .then(r => {
        const paged = r.data?.data;
        const colors = ['#3ecfb0','#d4a853','#e05c7a','#a08ff0','#c07df0','#e89050'];
        setItems((paged?.content ?? []).map(c => ({
          id:           c.id,
          name:         c.name ?? '—',
          industry:     c.industry ?? '—',
          abbr:         c.name ? c.name.slice(0,2).toUpperCase() : '?',
          color:        colors[c.name ? c.name.charCodeAt(0) % colors.length : 0],
          colorBg:      `${colors[c.name ? c.name.charCodeAt(0) % colors.length : 0]}26`,
          logoUrl:      c.logoUrl  ?? null,
          website:      c.website  ?? null,
          updatedLabel: fmtDate(c.updatedAt ?? c.createdAt),
          entries:      c.entryCount ?? '—',
          avgBase:      fmtSalary(c.avgBaseSalary),
          avgTC:        fmtSalary(c.avgTotalCompensation),
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
      <div className="section-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:16, marginBottom:32 }}>
        <div>
          <span className="section-tag">Company Directory</span>
          <h2 className="section-title">Browse <em>Companies</em></h2>
        </div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'var(--text-3)', padding:'6px 14px', background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:8 }}>
          {loading ? 'Loading…' : `${totalElements} compan${totalElements !== 1 ? 'ies' : 'y'}`}
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom:32 }}>
        <div className="search-box">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="input-field" type="text" placeholder="Search companies…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <select className="select-field" value={industry} onChange={e => { setIndustry(e.target.value); setPage(0); }}>
          <option value="">All Industries</option>
          {industries.map(i => <option key={i}>{i}</option>)}
        </select>
      </div>

      {loading && <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>Loading companies…</div>}
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
              <div key={c.id} className="company-card fade-up"
                onClick={() => setSelected(c)}
                style={{ cursor:'pointer', transition:'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <CompanyLogo
                    companyId={c.id}
                    companyName={c.name}
                    logoUrl={c.logoUrl}
                    website={c.website}
                    size={40}
                    radius={8}
                    style={{ marginBottom: 0 }}
                  />
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text-3)', background:'var(--ink-3)', padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)' }}>
                    Updated {c.updatedLabel}
                  </span>
                </div>
                <div className="company-card-name">{c.name}</div>
                <div className="company-card-industry">{c.industry}</div>
                <div className="company-card-stats">
                  <div className="cstat"><div className="cstat-val">{c.entries}</div><div className="cstat-label">Entries</div></div>
                  <div className="cstat"><div className="cstat-val">{c.avgBase}</div><div className="cstat-label">Avg Base</div></div>
                  <div className="cstat"><div className="cstat-val">{c.avgTC}</div><div className="cstat-label">Avg TC</div></div>
                </div>
                <div style={{ marginTop:12, fontSize:11, color:'var(--teal)', fontFamily:"'JetBrains Mono',monospace", opacity:0.7 }}>
                  Click to view salaries →
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="page-info">Showing {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE, totalElements)} of {totalElements}</span>
              <div className="page-btns">
                <button className="page-btn" disabled={page===0} onClick={() => setPage(p=>p-1)}>←</button>
                {Array.from({ length: totalPages }, (_, i) => i).map(p => (
                  <button key={p} className={`page-btn${p===page?' active':''}`} onClick={() => setPage(p)}>{p+1}</button>
                ))}
                <button className="page-btn" disabled={page===totalPages-1} onClick={() => setPage(p=>p+1)}>→</button>
              </div>
            </div>
          )}
        </>
      )}

      {selected && <CompanyModal company={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

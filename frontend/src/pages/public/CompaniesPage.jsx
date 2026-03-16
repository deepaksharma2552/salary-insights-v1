import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const PAGE_SIZE = 10;

function mapCompany(c) {
  const colors = ['#3ecfb0','#d4a853','#e05c7a','#a08ff0','#c07df0','#e89050'];
  const colorIdx = c.name ? c.name.charCodeAt(0) % colors.length : 0;
  const color = colors[colorIdx];
  const abbr = c.name ? c.name.slice(0, 2).toUpperCase() : '?';

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffH  = Math.floor(diffMs / 3600000);
    const diffD  = Math.floor(diffMs / 86400000);
    const diffW  = Math.floor(diffMs / 604800000);
    const diffMo = Math.floor(diffMs / 2592000000);
    if (diffH < 1)  return 'just now';
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7)  return `${diffD}d ago`;
    if (diffW < 4)  return `${diffW}w ago`;
    return `${diffMo}mo ago`;
  };

  return {
    id:           c.id,
    name:         c.name ?? '—',
    industry:     c.industry ?? '—',
    abbr,
    color,
    colorBg:      `${color}26`,
    updatedLabel: formatDate(c.updatedAt ?? c.createdAt),
    // entry counts and avg salaries not available from CompanyResponse — show placeholders
    entries:      '—',
    avgBase:      '—',
    avgTC:        '—',
  };
}

export default function CompaniesPage() {
  const [items,      setItems]      = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState('');
  const [industry,   setIndustry]   = useState('');
  const [page,       setPage]       = useState(0);
  const [totalPages,    setTotalPages]    = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Load industries once for filter dropdown
  useEffect(() => {
    api.get('/public/companies/industries')
      .then(res => setIndustries(res.data?.data ?? []))
      .catch(console.error);
  }, []);

  const fetchCompanies = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {
      page, size: PAGE_SIZE,
      ...(search   && { name: search }),
      ...(industry && { industry }),
    };
    api.get('/public/companies', { params })
      .then(res => {
        const paged = res.data?.data;
        setItems((paged?.content ?? []).map(mapCompany));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(err => { console.error(err); setError('Failed to load companies. Please try again.'); })
      .finally(() => setLoading(false));
  }, [page, search, industry]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  function handleFilter() { setPage(0); }

  const from = page * PAGE_SIZE + 1;
  const to   = Math.min((page + 1) * PAGE_SIZE, totalElements);

  return (
    <section className="section">
      <div className="section-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:16, marginBottom:32 }}>
        <div>
          <span className="section-tag">Company Directory</span>
          <h2 className="section-title">Browse <em>Companies</em></h2>
        </div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'var(--text-3)', padding:'6px 14px', background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:8 }}>
          {loading ? 'Loading…' : `${totalElements} compan${totalElements !== 1 ? 'ies' : 'y'} found`}
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom:32 }}>
        <div className="search-box">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="input-field" type="text" placeholder="Search companies by name or industry…"
            value={search} onChange={e => { setSearch(e.target.value); handleFilter(); }} />
        </div>
        <select className="select-field" value={industry} onChange={e => { setIndustry(e.target.value); handleFilter(); }}>
          <option value="">All Industries</option>
          {industries.map(i => <option key={i}>{i}</option>)}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>
          Loading companies…
        </div>
      )}
      {!loading && error && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--rose)', fontSize:14 }}>
          {error}<br/>
          <button onClick={fetchCompanies} style={{ marginTop:12, padding:'8px 20px', cursor:'pointer' }}>Retry</button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🔍</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--text-1)', marginBottom:8 }}>No companies found</div>
          <div style={{ fontSize:14, color:'var(--text-3)' }}>Try a different search term or clear the filters</div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="companies-grid">
            {items.map(c => (
              <div key={c.id} className="company-card fade-up">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <div className="company-card-logo" style={{ background:c.colorBg, color:c.color, marginBottom:0 }}>
                    {c.abbr}
                  </div>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text-3)', background:'var(--ink-3)', padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)' }}>
                    Updated {c.updatedLabel}
                  </span>
                </div>
                <div className="company-card-name">{c.name}</div>
                <div className="company-card-industry">{c.industry}</div>
                <div className="company-card-stats">
                  <div className="cstat">
                    <div className="cstat-val">{c.entries}</div>
                    <div className="cstat-label">Entries</div>
                  </div>
                  <div className="cstat">
                    <div className="cstat-val">{c.avgBase}</div>
                    <div className="cstat-label">Avg Base</div>
                  </div>
                  <div className="cstat">
                    <div className="cstat-val">{c.avgTC}</div>
                    <div className="cstat-label">Avg TC</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="page-info">Showing {from}–{to} of {totalElements} companies</span>
              <div className="page-btns">
                <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button>
                {Array.from({ length: totalPages }, (_, i) => i).map(p => (
                  <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p + 1}</button>
                ))}
                <button className="page-btn" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>→</button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

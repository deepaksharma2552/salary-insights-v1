import { useState, useEffect, useCallback } from 'react';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';

const PAGE_SIZE = 10;

function mapSalary(s) {
  const abbr = s.companyName ? s.companyName.slice(0, 2).toUpperCase() : '?';
  const colors = ['#3ecfb0','#d4a853','#e05c7a','#a08ff0','#c07df0','#e89050'];
  const colorIdx = s.companyName ? s.companyName.charCodeAt(0) % colors.length : 0;
  const color = colors[colorIdx];
  const levelMap = {
    INTERN: 'junior', ENTRY: 'junior', MID: 'mid',
    SENIOR: 'senior', LEAD: 'lead', MANAGER: 'lead',
    DIRECTOR: 'lead', VP: 'lead', C_LEVEL: 'lead',
  };
  const fmt = (val) => {
    if (!val && val !== 0) return '—';
    const l = Number(val) / 100000;
    return l >= 100 ? `₹${(l/100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
  };
  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };
  return {
    id: s.id, company: s.companyName ?? '—', compAbbr: abbr,
    compColor: color, compBg: `${color}26`, compInd: '',
    role: s.jobTitle ?? '—', internalLevel: s.companyInternalLevel ?? s.standardizedLevelName ?? '',
    level: levelMap[s.experienceLevel] ?? 'mid', location: s.location ?? '—',
    exp: s.yearsOfExperience != null ? `${s.yearsOfExperience} yr` : '—', yoe: s.yearsOfExperience != null ? `${s.yearsOfExperience} year${s.yearsOfExperience !== 1 ? 's' : ''}` : '—', empType: s.employmentType ?? 'Full-time',
    base: fmt(s.baseSalary), bonus: fmt(s.bonus), equity: fmt(s.equity),
    tc: fmt(s.totalCompensation), status: (s.reviewStatus ?? 'APPROVED').toLowerCase(),
    recordedAt: formatDate(s.createdAt), notes: '',
  };
}

const LEVEL_MAP = { junior: 'ENTRY', mid: 'MID', senior: 'SENIOR', lead: 'LEAD' };

export default function SalariesPage() {
  const [rows,          setRows]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [search,        setSearch]        = useState('');
  const [level,         setLevel]         = useState('');
  const [location,      setLocation]      = useState('');
  const [empType,       setEmpType]       = useState('');
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const fetchSalaries = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {
      page, size: PAGE_SIZE,
      ...(location && { location }),
      ...(level    && { experienceLevel: LEVEL_MAP[level] }),
      ...(search   && { jobTitle: search }),
    };
    api.get('/public/salaries', { params })
      .then(res => {
        const paged = res.data?.data;
        setRows((paged?.content ?? []).map(mapSalary));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(err => { console.error('Salaries API error:', err.response?.status, err.response?.data); setError(`Failed to load salaries (${err.response?.status ?? 'network error'}). Check console for details.`); })
      .finally(() => setLoading(false));
  }, [page, search, level, location]);

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  function handleFilter() { setPage(0); }

  const from = page * PAGE_SIZE + 1;
  const to   = Math.min((page + 1) * PAGE_SIZE, totalElements);

  return (
    <section className="section" style={{ background: 'var(--ink-2)' }}>
      <div className="section-header">
        <span className="section-tag">Browse Data</span>
        <h2 className="section-title">Salary <em>Database</em></h2>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="input-field" type="text" placeholder="Search roles, companies..."
            value={search} onChange={e => { setSearch(e.target.value); handleFilter(); }} />
        </div>

        <select className="select-field" value={level} onChange={e => { setLevel(e.target.value); handleFilter(); }}>
          <option value="">All Levels</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
        </select>

        <select className="select-field" value={location} onChange={e => { setLocation(e.target.value); handleFilter(); }}>
          <option value="">All Locations</option>
          <option>Bengaluru</option>
          <option>Hyderabad</option>
          <option>Mumbai</option>
          <option>Pune</option>
          <option>Delhi NCR</option>
        </select>

        <select className="select-field" value={empType} onChange={e => { setEmpType(e.target.value); handleFilter(); }}>
          <option value="">Employment Type</option>
          <option>Full-time</option>
          <option>Contract</option>
        </select>
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", fontSize:13 }}>
          Loading salaries…
        </div>
      )}
      {!loading && error && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--rose)', fontSize:14 }}>
          {error}<br/>
          <button onClick={fetchSalaries} style={{ marginTop:12, padding:'8px 20px', cursor:'pointer' }}>Retry</button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🔍</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--text-1)', marginBottom:8 }}>No salaries found</div>
          <div style={{ fontSize:14, color:'var(--text-3)' }}>Try adjusting your filters</div>
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <SalaryTable rows={rows} />
          {totalPages > 1 && (
            <div className="pagination">
              <span className="page-info">Showing {from}–{to} of {totalElements} entries</span>
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

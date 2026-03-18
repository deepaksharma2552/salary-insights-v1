import { useState, useEffect, useCallback, useRef } from 'react';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_SIZE = 10;

function mapSalary(s) {
  const abbr = s.companyName ? s.companyName.slice(0, 2).toUpperCase() : '?';
  const colors = ['#3ecfb0','#d4a853','#e05c7a','#a08ff0','#c07df0','#e89050'];
  const colorIdx = s.companyName ? s.companyName.charCodeAt(0) % colors.length : 0;
  const color = colors[colorIdx];
  const levelMap = {};  // kept for compatibility, unused
  const fmt = (val) => {
    if (!val && val !== 0) return '—';
    const l = Number(val) / 100000;
    return l >= 100 ? `₹${(l/100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
  };
  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  return {
    id: s.id, company: s.companyName ?? '—', compAbbr: abbr,
    compColor: color, compBg: `${color}26`, compInd: '',
    compWebsite: s.website ?? null, compLogoUrl: s.logoUrl ?? null,
    role: s.jobTitle ?? '—', internalLevel: s.standardizedLevelName ?? s.companyInternalLevel ?? '—',
    location: s.location ?? '—',
    exp: s.yearsOfExperience != null ? `${s.yearsOfExperience} yr` : '—',
    yoe: s.yearsOfExperience != null ? `${s.yearsOfExperience} year${s.yearsOfExperience !== 1 ? 's' : ''}` : '—',
    empType: s.employmentType ?? 'Full-time',
    base: fmt(s.baseSalary), bonus: fmt(s.bonus), equity: fmt(s.equity),
    tc: fmt(s.totalCompensation), status: (s.reviewStatus ?? 'APPROVED').toLowerCase(),
    recordedAt: formatDate(s.createdAt), notes: '',
  };
}

// Clamp page buttons to max 7 visible
function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4) return [0,1,2,3,4,'...',total-1];
  if (current > total - 5) return [0,'...',total-5,total-4,total-3,total-2,total-1];
  return [0,'...',current-1,current,current+1,'...',total-1];
}

export default function SalariesPage() {
  const [rows,          setRows]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // Filters
  const [search,   setSearch]   = useState('');
  const [location, setLocation] = useState('');
  const [empType,  setEmpType]  = useState('');

  // Pagination
  const [page,          setPage]          = useState(0);
  const [pageSize,      setPageSize]      = useState(DEFAULT_SIZE);
  const [totalPages,    setTotalPages]    = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Debounce search input
  const searchTimer = useRef(null);

  // Track whether any filter is active
  const isFiltering = search || location || empType;

  const fetchSalaries = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {
      page,
      size: pageSize,
      sort: 'createdAt,desc',
      ...(location && { location }),
      ...(search   && { companyName: search, jobTitle: search }),
    };
    api.get('/public/salaries', { params })
      .then(res => {
        const paged = res.data?.data;
        setRows((paged?.content ?? []).map(mapSalary));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(err => {
        console.error('Salaries API error:', err.response?.status, err.response?.data);
        setError(`Failed to load salaries (${err.response?.status ?? 'network error'})`);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, search, location]);

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(0); }, 400);
  }

  function handleFilterChange(setter) {
    return (e) => { setter(e.target.value); setPage(0); };
  }

  function handlePageSizeChange(e) {
    setPageSize(Number(e.target.value));
    setPage(0);
  }

  function clearFilters() {
    setSearch(''); setLevel(''); setLocation(''); setEmpType('');
    setPage(0);
  }

  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, totalElements);
  const pageRange = getPageRange(page, totalPages);

  return (
    <section className="section" style={{ background: 'var(--ink-2)' }}>
      <div className="section-header">
        <span className="section-tag">Browse Data</span>
        <h2 className="section-title">Salary <em>Database</em></h2>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="filter-bar">
        <div className="search-box">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input-field"
            type="text"
            placeholder="Search by company or role..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <select className="select-field" value={location} onChange={handleFilterChange(setLocation)}>
          <option value="">All Locations</option>
          <option value="BENGALURU">Bengaluru</option>
          <option value="HYDERABAD">Hyderabad</option>
          <option value="PUNE">Pune</option>
          <option value="DELHI_NCR">Delhi-NCR</option>
          <option value="KOCHI">Kochi</option>
          <option value="COIMBATORE">Coimbatore</option>
          <option value="MYSORE">Mysore</option>
          <option value="MANGALURU">Mangaluru</option>
        </select>

        <select className="select-field" value={empType} onChange={handleFilterChange(setEmpType)}>
          <option value="">Employment Type</option>
          <option>Full-time</option>
          <option>Contract</option>
        </select>

        {isFiltering && (
          <button
            onClick={clearFilters}
            style={{
              padding: '0 14px', height: 38, fontSize: 12, cursor: 'pointer',
              background: 'var(--rose-dim)', color: 'var(--rose)',
              border: '1px solid rgba(224,92,122,0.25)', borderRadius: 8,
              fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── STATES ── */}
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
          <div style={{ fontSize:14, color:'var(--text-3)', marginBottom:16 }}>
            {isFiltering ? 'Try adjusting your filters' : 'No approved salary entries yet'}
          </div>
          {isFiltering && (
            <button onClick={clearFilters} style={{ padding:'8px 20px', cursor:'pointer', fontSize:13 }}>Clear filters</button>
          )}
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <SalaryTable rows={rows} />

          {/* ── PAGINATION BAR ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12, marginTop: 24,
          }}>
            {/* Left: entry count + page size picker */}
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <span style={{ fontSize:13, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>
                {totalElements === 0 ? 'No entries' : `Showing ${from}–${to} of ${totalElements} entries`}
              </span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, color:'var(--text-3)' }}>Rows:</span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  style={{
                    fontSize: 12, padding: '4px 24px 4px 10px',
                    background: 'var(--ink-3)', border: '1px solid var(--border)',
                    borderRadius: 7, color: 'var(--text-1)', cursor: 'pointer',
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: page buttons */}
            {totalPages > 1 && (
              <div className="page-btns">
                <button className="page-btn" disabled={page === 0} onClick={() => setPage(0)} title="First">«</button>
                <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button>
                {pageRange.map((p, i) =>
                  p === '...'
                    ? <span key={`ellipsis-${i}`} style={{ padding:'0 4px', color:'var(--text-3)', fontSize:13 }}>…</span>
                    : <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p + 1}</button>
                )}
                <button className="page-btn" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>→</button>
                <button className="page-btn" disabled={page === totalPages - 1} onClick={() => setPage(totalPages - 1)} title="Last">»</button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

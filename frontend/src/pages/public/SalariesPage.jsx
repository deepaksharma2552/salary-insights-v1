import { useState, useMemo } from 'react';
import SalaryTable from '../../components/shared/SalaryTable';
import { SALARIES } from '../../data/salaryData';

const PAGE_SIZE = 10;

export default function SalariesPage() {
  const [search,   setSearch]   = useState('');
  const [level,    setLevel]    = useState('');
  const [location, setLocation] = useState('');
  const [company,  setCompany]  = useState('');
  const [empType,  setEmpType]  = useState('');
  const [page,     setPage]     = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SALARIES.filter(s => {
      if (q && !s.company.toLowerCase().includes(q) && !s.role.toLowerCase().includes(q)) return false;
      if (level    && s.level    !== level.toLowerCase())    return false;
      if (location && s.location !== location)               return false;
      if (company  && s.company  !== company)                return false;
      if (empType  && s.empType  !== empType)                return false;
      return true;
    });
  }, [search, level, location, company, empType]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilter() { setPage(1); }

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
            placeholder="Search roles, companies..."
            value={search}
            onChange={e => { setSearch(e.target.value); handleFilter(); }}
          />
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

        <select className="select-field" value={company} onChange={e => { setCompany(e.target.value); handleFilter(); }}>
          <option value="">All Companies</option>
          {[...new Set(SALARIES.map(s => s.company))].map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select className="select-field" value={empType} onChange={e => { setEmpType(e.target.value); handleFilter(); }}>
          <option value="">Employment Type</option>
          <option>Full-time</option>
          <option>Contract</option>
        </select>
      </div>

      {/* ── TABLE ── */}
      <SalaryTable rows={pageRows} />

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="pagination">
          <span className="page-info">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
          </span>
          <div className="page-btns">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
          </div>
        </div>
      )}
    </section>
  );
}

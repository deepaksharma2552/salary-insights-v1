import { useState, useMemo } from 'react';
import { ALL_COMPANIES } from '../../data/salaryData';

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const [search,   setSearch]   = useState('');
  const [industry, setIndustry] = useState('');
  const [page,     setPage]     = useState(1);

  const isSearching = search.trim() !== '' || industry !== '';

  const filtered = useMemo(() => {
    if (!isSearching) return ALL_COMPANIES.slice(0, 10); // default: last 10 updated
    const q = search.toLowerCase();
    return ALL_COMPANIES.filter(c => {
      const matchQ   = !q || c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q);
      const matchInd = !industry || c.industry === industry;
      return matchQ && matchInd;
    });
  }, [search, industry, isSearching]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const industries = [...new Set(ALL_COMPANIES.map(c => c.industry))].sort();

  function handleFilter() { setPage(1); }

  return (
    <section className="section">
      {/* ── HEADER ── */}
      <div
        className="section-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}
      >
        <div>
          <span className="section-tag">Company Directory</span>
          <h2 className="section-title">Browse <em>Companies</em></h2>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
          color: 'var(--text-3)', padding: '6px 14px',
          background: 'var(--ink-3)', border: '1px solid var(--border)', borderRadius: 8
        }}>
          {isSearching ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} found` : 'Showing last 10 updated'}
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="filter-bar" style={{ marginBottom: 32 }}>
        <div className="search-box">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input-field"
            type="text"
            placeholder="Search companies by name or industry…"
            value={search}
            onChange={e => { setSearch(e.target.value); handleFilter(); }}
          />
        </div>
        <select className="select-field" value={industry} onChange={e => { setIndustry(e.target.value); handleFilter(); }}>
          <option value="">All Industries</option>
          {industries.map(i => <option key={i}>{i}</option>)}
        </select>
      </div>

      {/* ── GRID ── */}
      {pageItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--text-1)', marginBottom: 8 }}>No companies found</div>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>Try a different search term or clear the filters</div>
        </div>
      ) : (
        <div className="companies-grid">
          {pageItems.map(c => (
            <div key={c.name} className="company-card fade-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div className="company-card-logo" style={{ background: c.colorBg, color: c.color, marginBottom: 0 }}>
                  {c.abbr}
                </div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-3)',
                  background: 'var(--ink-3)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)'
                }}>
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
      )}

      {/* ── PAGINATION ── */}
      {totalPages > 1 && (
        <div className="pagination">
          <span className="page-info">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} companies
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

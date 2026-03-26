import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';
import TopProgressBar from '../../components/shared/TopProgressBar';
import LevelGuideView from './LevelGuideView';
import ScrollableSelect from '../../components/shared/ScrollableSelect';
import { useLocations } from '../../hooks/useLocations';
import { mapSalary } from '../../utils/salaryMapper';
import SalaryBenchmarkTool from '../../components/shared/SalaryBenchmarkTool';

const LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
];

const EMP_TYPE_OPTIONS = [
  { value: '', label: 'Employment Type' },
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'FREELANCE', label: 'Freelance' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_SIZE      = 10;
const SEARCH_MIN_CHARS  = 3;   // minimum chars before auto-search triggers
const SEARCH_DEBOUNCE   = 600; // ms idle after last keystroke before auto-search

// ── Viz palette — consistent with DashboardPage ──
const LEVEL_MAP = { junior: 'ENTRY', mid: 'MID', senior: 'SENIOR', lead: 'LEAD' };

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4) return [0,1,2,3,4,'...',total-1];
  if (current > total - 5) return [0,'...',total-5,total-4,total-3,total-2,total-1];
  return [0,'...',current-1,current,current+1,'...',total-1];
}

export default function SalariesPage() {
  const { locations } = useLocations();
  const locationOptions = [{ value: '', label: 'All Locations' }, ...locations];
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return ['salaries', 'levels', 'benchmark'].includes(tab) ? tab : 'salaries';
  });

  const [rows,          setRows]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // Search: two-state — inputValue is what the user sees, search is what fires the API
  const [inputValue, setInputValue] = useState(() => searchParams.get('q') ?? '');
  const [search,     setSearch]     = useState(() => searchParams.get('q') ?? '');
  const debounceRef  = useRef(null);

  // Filters — seeded from URL
  const [level,    setLevel]    = useState(() => searchParams.get('level')    ?? '');
  const [location, setLocation] = useState(() => searchParams.get('location') ?? '');
  const [empType,  setEmpType]  = useState(() => searchParams.get('empType')  ?? '');

  // Pagination — seeded from URL
  const [page,          setPage]          = useState(() => Number(searchParams.get('page') ?? 0));
  const [pageSize,      setPageSize]      = useState(DEFAULT_SIZE);
  const [totalPages,    setTotalPages]    = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Deep-link entry id — opening a specific drawer from URL
  const [openEntryId, setOpenEntryId] = useState(() => searchParams.get('entry') ?? null);

  const isFiltering   = search || level || location || empType;
  const isDirty       = inputValue !== search;
  const showHint      = inputValue.length > 0 && inputValue.length < SEARCH_MIN_CHARS;

  // ── Sync filters → URL (replace so back-button works naturally) ──
  useEffect(() => {
    const params = {};
    if (search)   params.q        = search;
    if (level)    params.level    = level;
    if (location) params.location = location;
    if (empType)  params.empType  = empType;
    if (page > 0) params.page     = String(page);
    if (openEntryId) params.entry = openEntryId;
    setSearchParams(params, { replace: true });
  }, [search, level, location, empType, page, openEntryId]); // eslint-disable-line

  // ── Commit the current inputValue as the search query ──
  function commitSearch(value) {
    clearTimeout(debounceRef.current);
    setSearch(value);
    setPage(0);
  }

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

  function handlePageSizeChange(e) {
    setPageSize(Number(e.target.value));
    setPage(0);
  }

  function clearFilters() {
    clearTimeout(debounceRef.current);
    setInputValue(''); setSearch('');
    setLevel(''); setLocation(''); setEmpType('');
    setPage(0);
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const fetchSalaries = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {
      page,
      size: pageSize,
      sort: 'createdAt,desc',
      ...(location && { location }),
      ...(level    && { experienceLevel: LEVEL_MAP[level] }),
      ...(search   && { companyName: search, jobTitle: search }),
      ...(empType  && { employmentType: empType }),
    };
    api.get('/public/salaries', { params })
      .then(res => {
        const paged = res.data?.data;
        setRows((paged?.content ?? []).map(s => mapSalary(s)));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(err => {
        console.error('Salaries API error:', err.response?.status, err.response?.data);
        setError(`Failed to load salaries (${err.response?.status ?? 'network error'})`);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, search, level, location, empType]);

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  const from     = totalElements === 0 ? 0 : page * pageSize + 1;
  const to       = Math.min((page + 1) * pageSize, totalElements);
  const pageRange = getPageRange(page, totalPages);

  return (
    <section className="section" style={{ background: 'var(--ink-2)' }}>
      <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <span className="section-tag">Browse Data</span>
        <h2 className="section-title">Salary <em>Database</em></h2>
      </div>

      {/* ── View toggle ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { id: 'salaries',   label: '📄 Salary Database' },
          { id: 'levels',     label: '🗂 Level Guide' },
          { id: 'benchmark', label: '📊 Benchmark My Offer' },
        ].map(t => (
          <button key={t.id} onClick={() => { TopProgressBar.start(); setView(t.id); setTimeout(() => TopProgressBar.done(), 150); }} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: view === t.id ? 600 : 400,
            background: view === t.id ? 'var(--panel)' : 'transparent',
            color: view === t.id ? 'var(--text-1)' : 'var(--text-3)',
            boxShadow: view === t.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Level Guide view ── */}
      {view === 'levels' && <LevelGuideView />}

      {/* ── Benchmark tool view ── */}
      {view === 'benchmark' && <SalaryBenchmarkTool />}

      {/* ── Salary Database view ── */}
      {view === 'salaries' && (<>

      {/* ── FILTER BAR ── */}
      <div className="filter-bar">
        {/* Search box with hint */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <div className="search-box" style={{ width: '100%' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="input-field"
              type="text"
              placeholder="Search by company or role…"
              value={inputValue}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              style={{ paddingRight: isDirty ? 60 : 10 }}
            />
            {/* Enter hint — shown when 3+ chars typed but not yet committed */}
            {inputValue.length >= SEARCH_MIN_CHARS && isDirty && (
              <span
                onClick={() => commitSearch(inputValue)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 10, color: 'var(--viz-1, #3b82f6)',
                  fontFamily: "'IBM Plex Mono',monospace",
                  cursor: 'pointer', userSelect: 'none',
                  background: 'var(--bg-2)', padding: '1px 5px',
                  borderRadius: 4, border: '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                }}
              >
                ↵ Search
              </span>
            )}
          </div>
          {/* Too-short hint */}
          {showHint && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0,
              fontSize: 10, color: 'var(--text-3)',
              fontFamily: "'IBM Plex Mono',monospace",
            }}>
              Type {SEARCH_MIN_CHARS - inputValue.length} more character{SEARCH_MIN_CHARS - inputValue.length !== 1 ? 's' : ''} to search
            </div>
          )}
        </div>

        <ScrollableSelect
          value={level}
          onChange={v => { setLevel(v); setPage(0); }}
          options={LEVEL_OPTIONS}
          placeholder="All Levels"
        />

        <ScrollableSelect
          value={location}
          onChange={v => { setLocation(v); setPage(0); }}
          options={locationOptions}
          placeholder="All Locations"
        />

        <ScrollableSelect
          value={empType}
          onChange={v => { setEmpType(v); setPage(0); }}
          options={EMP_TYPE_OPTIONS}
          placeholder="Employment Type"
        />

        {isFiltering && (
          <button
            onClick={clearFilters}
            style={{
              padding: '0 14px', height: 38, fontSize: 12, cursor: 'pointer',
              background: 'var(--viz-2-dim, #f5f3ff)', color: 'var(--viz-2, #8b5cf6)',
              border: '1px solid #8b5cf640', borderRadius: 8,
              fontFamily: "'IBM Plex Mono',monospace", whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── STATES ── */}
      {loading && (
        <div style={{ padding: '60px 0 58px' }}>
          <div style={{ width: '100%', height: 3, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)',
              borderRadius: 99,
              animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards',
            }} />
          </div>
        </div>
      )}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--rose)', fontSize: 14 }}>
          {error}<br/>
          <button onClick={fetchSalaries} style={{ marginTop: 12, padding: '8px 20px', cursor: 'pointer' }}>Retry</button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: 'var(--text-1)', marginBottom: 8 }}>No salaries found</div>
          <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 16 }}>
            {isFiltering ? 'Try adjusting your filters' : 'No approved salary entries yet'}
          </div>
          {isFiltering && (
            <button onClick={clearFilters} style={{ padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>Clear filters</button>
          )}
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="table-scroll-wrap">
            <SalaryTable
              rows={rows}
              openEntryId={openEntryId}
              onEntryClose={() => setOpenEntryId(null)}
            />
          </div>

          {/* ── PAGINATION ── */}
          <div className="pagination" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
                {totalElements === 0 ? 'No entries' : `Showing ${from}–${to} of ${totalElements} entries`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Rows:</span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  style={{
                    fontSize: 12, padding: '4px 24px 4px 10px',
                    background: 'var(--bg-2)', border: '1px solid var(--border)',
                    borderRadius: 7, color: 'var(--text-1)', cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono',monospace",
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="page-btns">
                <button className="page-btn" disabled={page === 0} onClick={() => setPage(0)} title="First">«</button>
                <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button>
                {pageRange.map((p, i) =>
                  p === '...'
                    ? <span key={`e-${i}`} style={{ padding: '0 4px', color: 'var(--text-3)', fontSize: 13 }}>…</span>
                    : <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p + 1}</button>
                )}
                <button className="page-btn" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>→</button>
                <button className="page-btn" disabled={page === totalPages - 1} onClick={() => setPage(totalPages - 1)} title="Last">»</button>
              </div>
            )}
          </div>
        </>
      )}
    </>
    )}
    </section>
  );
}
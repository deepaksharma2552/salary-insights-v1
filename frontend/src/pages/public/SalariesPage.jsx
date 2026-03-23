import { useState, useEffect, useCallback, useRef } from 'react';
import SalaryTable from '../../components/shared/SalaryTable';
import api from '../../services/api';
import TopProgressBar from '../../components/shared/TopProgressBar';
import LevelGuideView from './LevelGuideView';
import ScrollableSelect from '../../components/shared/ScrollableSelect';

const LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
];

const LOCATION_OPTIONS = [
  { value: '', label: 'All Locations' },
  { value: 'BENGALURU', label: 'Bengaluru' },
  { value: 'HYDERABAD', label: 'Hyderabad' },
  { value: 'PUNE', label: 'Pune' },
  { value: 'DELHI_NCR', label: 'Delhi-NCR' },
  { value: 'KOCHI', label: 'Kochi' },
  { value: 'COIMBATORE', label: 'Coimbatore' },
  { value: 'MYSORE', label: 'Mysore' },
  { value: 'MANGALURU', label: 'Mangaluru' },
];

const EMP_TYPE_OPTIONS = [
  { value: '', label: 'Employment Type' },
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Contract', label: 'Contract' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_SIZE      = 10;
const SEARCH_MIN_CHARS  = 3;   // minimum chars before auto-search triggers
const SEARCH_DEBOUNCE   = 600; // ms idle after last keystroke before auto-search

// ── Viz palette — consistent with DashboardPage ──
const VIZ_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#6366f1','#a78bfa','#818cf8'];

function mapSalary(s) {
  const abbr     = s.companyName ? s.companyName.slice(0, 2).toUpperCase() : '?';
  const colorIdx = s.companyName ? s.companyName.charCodeAt(0) % VIZ_COLORS.length : 0;
  const color    = VIZ_COLORS[colorIdx];
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
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  return {
    id: s.id, company: s.companyName ?? '—', compAbbr: abbr,
    compColor: color, compBg: `${color}26`, compInd: '',
    companyId: s.companyId ?? null,
    logoUrl:   s.logoUrl   ?? null,
    website:   s.website   ?? null,
    role: s.jobTitle ?? '—',
    internalLevel: s.standardizedLevelName ?? s.companyInternalLevel ?? '—',
    level: levelMap[s.experienceLevel] ?? 'mid',
    location: s.location ?? '—',
    exp: s.yearsOfExperience != null ? `${s.yearsOfExperience} yr` : '—',
    yoe: s.yearsOfExperience != null ? `${s.yearsOfExperience} year${s.yearsOfExperience !== 1 ? 's' : ''}` : '—',
    empType: s.employmentType ?? 'Full-time',
    base: fmt(s.baseSalary), bonus: fmt(s.bonus), equity: fmt(s.equity),
    tc: fmt(s.totalCompensation),
    status: (s.reviewStatus ?? 'APPROVED').toLowerCase(),
    recordedAt: formatDate(s.createdAt), notes: '',
  };
}

const LEVEL_MAP = { junior: 'ENTRY', mid: 'MID', senior: 'SENIOR', lead: 'LEAD' };

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4) return [0,1,2,3,4,'...',total-1];
  if (current > total - 5) return [0,'...',total-5,total-4,total-3,total-2,total-1];
  return [0,'...',current-1,current,current+1,'...',total-1];
}

export default function SalariesPage() {
  const [view, setView] = useState('salaries'); // 'salaries' | 'levels'

  const [rows,          setRows]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // ── Search: two-state approach ──
  // inputValue  = what the user sees in the box (updates on every keystroke)
  // search      = committed value that actually triggers the API call
  const [inputValue, setInputValue] = useState('');
  const [search,     setSearch]     = useState('');
  const debounceRef  = useRef(null);

  // Other filters
  const [level,    setLevel]    = useState('');
  const [location, setLocation] = useState('');
  const [empType,  setEmpType]  = useState('');

  // Pagination
  const [page,          setPage]          = useState(0);
  const [pageSize,      setPageSize]      = useState(DEFAULT_SIZE);
  const [totalPages,    setTotalPages]    = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const isFiltering   = search || level || location || empType;
  const isDirty       = inputValue !== search; // typed but not yet committed
  const showHint      = inputValue.length > 0 && inputValue.length < SEARCH_MIN_CHARS;

  // ── Commit the current inputValue as the search query ──
  function commitSearch(value) {
    clearTimeout(debounceRef.current);
    setSearch(value);
    setPage(0);
  }

  // ── Handle keystroke ──
  function handleSearchChange(e) {
    const val = e.target.value;
    setInputValue(val);
    clearTimeout(debounceRef.current);

    if (val.length === 0) {
      // Cleared — reset immediately
      commitSearch('');
      return;
    }
    if (val.length < SEARCH_MIN_CHARS) {
      // Too short — do nothing yet
      return;
    }
    // 3+ chars — start debounce timer
    debounceRef.current = setTimeout(() => commitSearch(val), SEARCH_DEBOUNCE);
  }

  // ── Enter key — commit immediately ──
  function handleSearchKeyDown(e) {
    if (e.key === 'Enter' && inputValue.length >= SEARCH_MIN_CHARS) {
      commitSearch(inputValue);
    }
  }

  function handleFilterChange(setter) {
    return (e) => { setter(e.target.value); setPage(0); };
  }

  function handlePageSizeChange(e) {
    setPageSize(Number(e.target.value));
    setPage(0);
  }

  function clearFilters() {
    clearTimeout(debounceRef.current);
    setInputValue('');
    setSearch('');
    setLevel('');
    setLocation('');
    setEmpType('');
    setPage(0);
  }

  // Cleanup debounce on unmount
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
  }, [page, pageSize, search, level, location]);

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
          { id: 'salaries', label: '📄 Salary Database' },
          { id: 'levels',   label: '🗂 Level Guide' },
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
          options={LOCATION_OPTIONS}
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
          <SalaryTable rows={rows} />

          {/* ── PAGINATION ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
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
import { useState, useEffect, useCallback, useRef } from 'react';
import SalaryTable from '../../components/shared/SalaryTable';
import MultiFilter from '../../components/shared/MultiFilter';
import api from '../../services/api';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_SIZE      = 10;
const SEARCH_MIN_CHARS  = 3;
const SEARCH_DEBOUNCE   = 600;
const FILTER_DEBOUNCE   = 300; // debounce multiselect changes — prevents burst API calls

const VIZ_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#6366f1','#a78bfa','#818cf8'];

const LEVEL_OPTIONS = [
  { label: 'Intern (0–1 yr)',          value: 'INTERN'   },
  { label: 'Junior / Entry (1–2 yrs)', value: 'ENTRY'    },
  { label: 'Mid-level (2–5 yrs)',      value: 'MID'      },
  { label: 'Senior (5–8 yrs)',         value: 'SENIOR'   },
  { label: 'Lead / Staff (8–12 yrs)',  value: 'LEAD'     },
  { label: 'Manager (12–16 yrs)',      value: 'MANAGER'  },
  { label: 'Director (16–20 yrs)',     value: 'DIRECTOR' },
  { label: 'VP / SVP (20+ yrs)',       value: 'VP'       },
  { label: 'C-Level',                  value: 'C_LEVEL'  },
];

const LOCATION_OPTIONS = [
  'Bengaluru', 'Hyderabad', 'Pune', 'Delhi-NCR',
  'Kochi', 'Coimbatore', 'Mysore', 'Mangaluru',
];

const EMP_TYPE_OPTIONS = ['FULL_TIME', 'CONTRACT', 'PART_TIME'];
const EMP_TYPE_LABELS  = { FULL_TIME: 'Full-time', CONTRACT: 'Contract', PART_TIME: 'Part-time' };

function Chip({ label, onRemove, color = '#3b82f6' }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99,
      background: `${color}18`, border: `1px solid ${color}40`,
      fontSize: 11, color, fontWeight: 500,
    }}>
      {label}
      <span onClick={onRemove} style={{ cursor: 'pointer', opacity: 0.65, fontSize: 13, lineHeight: 1 }}>×</span>
    </div>
  );
}

function mapSalary(s) {
  const abbr     = s.companyName ? s.companyName.slice(0, 2).toUpperCase() : '?';
  const colorIdx = s.companyName ? s.companyName.charCodeAt(0) % VIZ_COLORS.length : 0;
  const color    = VIZ_COLORS[colorIdx];
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
    companyId: s.companyId ?? null, logoUrl: s.logoUrl ?? null, website: s.website ?? null,
    role: s.jobTitle ?? '—',
    internalLevel: s.standardizedLevelName ?? s.companyInternalLevel ?? '—',
    level: s.experienceLevel?.toLowerCase() ?? 'mid',
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

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  if (current < 4) return [0,1,2,3,4,'...',total-1];
  if (current > total - 5) return [0,'...',total-5,total-4,total-3,total-2,total-1];
  return [0,'...',current-1,current,current+1,'...',total-1];
}

export default function SalariesPage() {
  const [rows,           setRows]           = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refetching,     setRefetching]     = useState(false);
  const [error,          setError]          = useState(null);

  // Search
  const [inputValue, setInputValue] = useState('');
  const [search,     setSearch]     = useState('');
  const searchDebounceRef = useRef(null);

  // Multiselect filters — staged (pending) vs committed (sent to API)
  // Staging prevents a burst of API calls when user checks multiple boxes quickly
  const [selLevels,       setSelLevels]       = useState([]);
  const [selLocations,    setSelLocations]     = useState([]);
  const [selEmpTypes,     setSelEmpTypes]      = useState([]);
  const [committedLevels,    setCommittedLevels]    = useState([]);
  const [committedLocations, setCommittedLocations] = useState([]);
  const [committedEmpTypes,  setCommittedEmpTypes]  = useState([]);
  const filterDebounceRef = useRef(null);

  // Pagination
  const [page,          setPage]          = useState(0);
  const [pageSize,      setPageSize]      = useState(DEFAULT_SIZE);
  const [totalPages,    setTotalPages]    = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const isFiltering = search || selLevels.length > 0 || selLocations.length > 0 || selEmpTypes.length > 0;
  const isDirty     = inputValue !== search;
  const showHint    = inputValue.length > 0 && inputValue.length < SEARCH_MIN_CHARS;

  // ── Search commit ─────────────────────────────────────────────────────────
  function commitSearch(value) {
    clearTimeout(searchDebounceRef.current);
    setSearch(value);
    setPage(0);
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setInputValue(val);
    clearTimeout(searchDebounceRef.current);
    if (val.length === 0) { commitSearch(''); return; }
    if (val.length < SEARCH_MIN_CHARS) return;
    searchDebounceRef.current = setTimeout(() => commitSearch(val), SEARCH_DEBOUNCE);
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter' && inputValue.length >= SEARCH_MIN_CHARS) commitSearch(inputValue);
  }

  // ── Filter change — debounced commit ──────────────────────────────────────
  function handleLevelsChange(v) {
    setSelLevels(v);
    clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => { setCommittedLevels(v); setPage(0); }, FILTER_DEBOUNCE);
  }
  function handleLocationsChange(v) {
    setSelLocations(v);
    clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => { setCommittedLocations(v); setPage(0); }, FILTER_DEBOUNCE);
  }
  function handleEmpTypesChange(v) {
    setSelEmpTypes(v);
    clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => { setCommittedEmpTypes(v); setPage(0); }, FILTER_DEBOUNCE);
  }

  function clearFilters() {
    clearTimeout(searchDebounceRef.current);
    clearTimeout(filterDebounceRef.current);
    setInputValue(''); setSearch('');
    setSelLevels([]); setSelLocations([]); setSelEmpTypes([]);
    setCommittedLevels([]); setCommittedLocations([]); setCommittedEmpTypes([]);
    setPage(0);
  }

  useEffect(() => () => {
    clearTimeout(searchDebounceRef.current);
    clearTimeout(filterDebounceRef.current);
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchSalaries = useCallback((silent = false) => {
    if (silent) setRefetching(true);
    else        setInitialLoading(true);
    setError(null);

    const params = { page, size: pageSize, sort: 'createdAt,desc' };
    if (search)                    { params.companyName = search; params.jobTitle = search; }
    if (committedLocations.length) params.location         = committedLocations;
    if (committedLevels.length)    params.experienceLevel   = committedLevels;
    if (committedEmpTypes.length)  params.employmentType    = committedEmpTypes;

    api.get('/public/salaries', { params })
      .then(res => {
        const paged = res.data?.data;
        setRows((paged?.content ?? []).map(mapSalary));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(err => setError(`Failed to load salaries (${err.response?.status ?? 'network error'})`))
      .finally(() => { setInitialLoading(false); setRefetching(false); });
  }, [page, pageSize, search, committedLevels, committedLocations, committedEmpTypes]);

  // Initial load
  useEffect(() => { fetchSalaries(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Subsequent fetches — silent (table stays visible, progress bar shows)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchSalaries(true);
  }, [fetchSalaries]);

  const from      = totalElements === 0 ? 0 : page * pageSize + 1;
  const to        = Math.min((page + 1) * pageSize, totalElements);
  const pageRange = getPageRange(page, totalPages);

  const levelLabel   = v => LEVEL_OPTIONS.find(o => o.value === v)?.label ?? v;
  const empTypeLabel = v => EMP_TYPE_LABELS[v] ?? v;

  return (
    <section className="section" style={{ background: 'var(--ink-2)' }}>
      <style>{`
        @keyframes progressCrawl {
          0%   { width: 0%;  }
          40%  { width: 65%; }
          70%  { width: 82%; }
          100% { width: 90%; }
        }
      `}</style>

      <div className="section-header">
        <span className="section-tag">Browse Data</span>
        <h2 className="section-title">Salary <em>Database</em></h2>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="filter-bar">
        {/* Search */}
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
            {inputValue.length >= SEARCH_MIN_CHARS && isDirty && (
              <span
                onClick={() => commitSearch(inputValue)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 10, color: '#3b82f6', fontFamily: "'IBM Plex Mono',monospace",
                  cursor: 'pointer', userSelect: 'none',
                  background: 'var(--bg-2)', padding: '1px 5px',
                  borderRadius: 4, border: '1px solid var(--border)', whiteSpace: 'nowrap',
                }}
              >
                ↵ Search
              </span>
            )}
          </div>
          {showHint && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0,
              fontSize: 10, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace",
            }}>
              Type {SEARCH_MIN_CHARS - inputValue.length} more character{SEARCH_MIN_CHARS - inputValue.length !== 1 ? 's' : ''} to search
            </div>
          )}
        </div>

        <MultiFilter label="Level"    items={LEVEL_OPTIONS.map(o => o.value)} selected={selLevels}    onChange={handleLevelsChange}    max={9} accentColor="#8b5cf6" />
        <MultiFilter label="Location" items={LOCATION_OPTIONS}                selected={selLocations} onChange={handleLocationsChange} max={8} accentColor="#06b6d4" />
        <MultiFilter label="Emp Type" items={EMP_TYPE_OPTIONS}                selected={selEmpTypes}  onChange={handleEmpTypesChange}  max={3} accentColor="#6366f1" />

        {isFiltering && (
          <button
            onClick={clearFilters}
            style={{
              padding: '0 14px', height: 38, fontSize: 12, cursor: 'pointer',
              background: 'var(--viz-2-dim,#f5f3ff)', color: '#8b5cf6',
              border: '1px solid #8b5cf640', borderRadius: 8,
              fontFamily: "'IBM Plex Mono',monospace", whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            ✕ Clear all
          </button>
        )}
      </div>

      {/* Active chips */}
      {(selLevels.length > 0 || selLocations.length > 0 || selEmpTypes.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {selLevels.map(v    => <Chip key={v} label={levelLabel(v)}   color="#8b5cf6" onRemove={() => handleLevelsChange(selLevels.filter(l => l !== v))} />)}
          {selLocations.map(l => <Chip key={l} label={l}               color="#06b6d4" onRemove={() => handleLocationsChange(selLocations.filter(x => x !== l))} />)}
          {selEmpTypes.map(v  => <Chip key={v} label={empTypeLabel(v)} color="#6366f1" onRemove={() => handleEmpTypesChange(selEmpTypes.filter(x => x !== v))} />)}
        </div>
      )}

      {/* Progress bar — visible while re-fetching, table stays rendered */}
      <div style={{ height: 3, marginBottom: 8, borderRadius: 99, overflow: 'hidden', background: refetching ? 'rgba(59,130,246,0.12)' : 'transparent', transition: 'background 0.2s' }}>
        {refetching && (
          <div style={{
            height: '100%', background: 'linear-gradient(90deg,#60a5fa,#3b82f6)',
            borderRadius: 99, animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards',
          }} />
        )}
      </div>

      {/* States */}
      {initialLoading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>
          Loading salaries…
        </div>
      )}
      {!initialLoading && error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--rose)', fontSize: 14 }}>
          {error}<br/>
          <button onClick={() => fetchSalaries(false)} style={{ marginTop: 12, padding: '8px 20px', cursor: 'pointer' }}>Retry</button>
        </div>
      )}
      {!initialLoading && !error && rows.length === 0 && !refetching && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: 'var(--text-1)', marginBottom: 8 }}>No salaries found</div>
          <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 16 }}>
            {isFiltering ? 'Try adjusting your filters' : 'No approved salary entries yet'}
          </div>
          {isFiltering && <button onClick={clearFilters} style={{ padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>Clear filters</button>}
        </div>
      )}

      {!initialLoading && !error && rows.length > 0 && (
        <>
          <SalaryTable rows={rows} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
                {totalElements === 0 ? 'No entries' : `Showing ${from}–${to} of ${totalElements} entries`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Rows:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                  style={{ fontSize: 12, padding: '4px 24px 4px 10px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-1)', cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace" }}
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
    </section>
  );
}

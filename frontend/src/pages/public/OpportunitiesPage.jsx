import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const PAGE_SIZE = 20;

const TYPE_OPTIONS  = ['REFERRAL','INTERNSHIP','FULL_TIME','CONTRACT','DRIVE'];
const MODE_OPTIONS  = ['REMOTE','HYBRID','ONSITE'];

const TYPE_LABEL = {
  REFERRAL:   'Referral',
  INTERNSHIP: 'Internship',
  FULL_TIME:  'Full-time',
  CONTRACT:   'Contract',
  DRIVE:      'Drive',
};

const TYPE_STYLE = {
  REFERRAL:   { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  INTERNSHIP: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
  FULL_TIME:  { background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe' },
  CONTRACT:   { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
  DRIVE:      { background: '#f0fdfa', color: '#065f46', border: '1px solid #99f6e4' },
};

function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt) - Date.now()) / 86_400_000);
}

function DeadlineChip({ expiresAt }) {
  const d = daysLeft(expiresAt);
  if (d === null) return <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>;
  const urgent = d <= 7;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace",
      background: urgent ? 'var(--red-dim)'  : 'var(--blue-dim)',
      color:      urgent ? 'var(--red)'      : 'var(--blue)',
      border:     `1px solid ${urgent ? 'rgba(220,38,38,0.2)' : 'rgba(59,130,246,0.2)'}`,
    }}>
      {d <= 0 ? 'Today' : `${d}d left`}
    </span>
  );
}

function TypeBadge({ type }) {
  const style = TYPE_STYLE[type] ?? {};
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, ...style,
    }}>
      {TYPE_LABEL[type] ?? type}
    </span>
  );
}

function CoAvatar({ name }) {
  const abbr = name ? name.slice(0, 2).toUpperCase() : '??';
  const colors = ['#eff6ff','#f0fdf4','#f5f3ff','#fffbeb','#fef2f2','#ecfeff'];
  const textColors = ['#1d4ed8','#166534','#5b21b6','#92400e','#991b1b','#0e7490'];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: colors[idx], color: textColors[idx],
      fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 600,
    }}>{abbr}</div>
  );
}

export default function OpportunitiesPage() {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [hasMore,   setHasMore]   = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([null]);

  const [typeFilter,   setTypeFilter]   = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [modeFilter,   setModeFilter]   = useState('');
  const [search,       setSearch]       = useState('');

  const [stats, setStats] = useState(null);

  const debounceRef = useRef(null);

  const currentPage = cursorStack.length;
  const currentCursor = cursorStack[cursorStack.length - 1];

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {
      size: PAGE_SIZE,
      ...(currentCursor  && { cursor: currentCursor }),
      ...(typeFilter     && { type: typeFilter }),
      ...(locationFilter && { location: locationFilter }),
      ...(modeFilter     && { workMode: modeFilter }),
    };
    api.get('/public/opportunities', { params })
      .then(r => {
        const page = r.data?.data;
        setRows(page?.content ?? []);
        setHasMore(page?.hasMore ?? false);
        setNextCursor(page?.nextCursor ?? null);
      })
      .catch(err => setError(err.response?.data?.message ?? 'Failed to load opportunities.'))
      .finally(() => setLoading(false));
  }, [currentCursor, typeFilter, locationFilter, modeFilter]);

  useEffect(() => { load(); }, [load]);

  // Load stats once
  useEffect(() => {
    api.get('/public/opportunities', { params: { size: 1 } })
      .then(() => {
        // We'll just show filter counts from the type tabs
      }).catch(() => {});
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  function goNext() {
    if (!nextCursor) return;
    setCursorStack(prev => [...prev, nextCursor]);
  }
  function goPrev() {
    if (cursorStack.length <= 1) return;
    setCursorStack(prev => prev.slice(0, -1));
  }
  function resetPage() { setCursorStack([null]); setNextCursor(null); }

  function handleType(v)     { setTypeFilter(v);     resetPage(); }
  function handleMode(v)     { setModeFilter(v);     resetPage(); }
  function handleLocation(v) { setLocationFilter(v); resetPage(); }

  const hasFilters = typeFilter || modeFilter || locationFilter;

  // Client-side search filter on loaded rows
  const filtered = search
    ? rows.filter(r =>
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.companyName?.toLowerCase().includes(search.toLowerCase()) ||
        r.role?.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  return (
    <section className="section">

      {/* Header */}
      <div className="section-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <span className="section-tag">Community</span>
          <h2 className="section-title">Opportunities <em>Board</em></h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>
            Community-curated openings — referrals, internships, full-time and more. Click Apply to go directly.
          </p>
        </div>
        <Link to="/opportunities/post" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          + Post an opportunity
        </Link>
      </div>

      {/* Type filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <button
          onClick={() => handleType('')}
          style={{ padding: '4px 14px', fontSize: 12, fontWeight: 500, borderRadius: 99, border: '1px solid var(--border)', background: !typeFilter ? 'var(--blue-dim)' : 'transparent', color: !typeFilter ? 'var(--blue)' : 'var(--text-2)', cursor: 'pointer' }}
        >All</button>
        {TYPE_OPTIONS.map(t => (
          <button key={t} onClick={() => handleType(t)}
            style={{ padding: '4px 14px', fontSize: 12, fontWeight: 500, borderRadius: 99, border: '1px solid var(--border)', background: typeFilter === t ? 'var(--blue-dim)' : 'transparent', color: typeFilter === t ? 'var(--blue)' : 'var(--text-2)', cursor: 'pointer' }}
          >{TYPE_LABEL[t]}</button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="search-box" style={{ minWidth: 200 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: 'var(--text-3)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input-field" placeholder="Search role, company…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 4px' }} />
        <select className="select-field" value={modeFilter} onChange={e => handleMode(e.target.value)}>
          <option value="">Work mode</option>
          {MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="select-field" value={locationFilter} onChange={e => handleLocation(e.target.value)}>
          <option value="">All locations</option>
          {['Bangalore','Mumbai','Hyderabad','Delhi-NCR','Pune','Chennai','Remote'].map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        {hasFilters && (
          <button onClick={() => { setTypeFilter(''); setModeFilter(''); setLocationFilter(''); resetPage(); }}
            style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--red-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", padding: '32px 0' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          {hasFilters || search ? 'No opportunities match the current filters.' : 'No opportunities posted yet. Be the first!'}
        </div>
      ) : (
        <div className="salary-table-wrap">
          <table className="salary-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Role</th>
                <th style={{ width: '15%' }}>Company</th>
                <th style={{ width: '10%' }}>Type</th>
                <th style={{ width: '11%' }}>Pay / Stipend</th>
                <th style={{ width: '9%'  }}>Location</th>
                <th style={{ width: '7%'  }}>Mode</th>
                <th style={{ width: '10%' }}>Deadline</th>
                <th style={{ width: '6%'  }}>Posted by</th>
                <th style={{ width: '4%'  }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(opp => (
                <tr key={opp.id} className="clickable">
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 13 }}>{opp.title}</div>
                    {opp.experienceRequired && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{opp.experienceRequired}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CoAvatar name={opp.companyName} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 13 }}>{opp.companyName}</div>
                      </div>
                    </div>
                  </td>
                  <td><TypeBadge type={opp.type} /></td>
                  <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, fontSize: 12, color: 'var(--text-1)' }}>
                    {opp.stipendOrSalary ?? <span style={{ color: 'var(--text-4)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>{opp.location ?? '—'}</td>
                  <td style={{ fontSize: 12 }}>{opp.workMode ?? '—'}</td>
                  <td><DeadlineChip expiresAt={opp.expiresAt} /></td>
                  <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{opp.postedByName?.trim() || '—'}</td>
                  <td>
                    <a href={opp.applyLink} target="_blank" rel="noopener noreferrer" className="view-btn"
                      style={{ textDecoration: 'none' }}>
                      Apply →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination" style={{ padding: '12px 16px' }}>
            <span className="page-info">
              Page {currentPage}
              {(hasFilters || search) && <span style={{ marginLeft: 8, color: 'var(--blue)', fontWeight: 500 }}>· filtered</span>}
            </span>
            <div className="page-btns">
              <button className="page-btn" disabled={cursorStack.length <= 1 || loading} onClick={goPrev}>← Prev</button>
              <button className="page-btn" disabled={!hasMore || loading} onClick={goNext}>Next →</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

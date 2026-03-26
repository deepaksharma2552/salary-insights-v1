import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [25, 50, 100];

const EXPERIENCE_LEVELS = ['INTERN','ENTRY','MID','SENIOR','LEAD','MANAGER','DIRECTOR','VP'];
const EMPLOYMENT_TYPES  = ['FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP'];

const LOCATION_OPTIONS = [
  'Bengaluru','Delhi-NCR','Mumbai','Hyderabad','Chennai','Pune','Kolkata',
  'Remote India','Remote US','San Francisco Bay Area','New York','Seattle',
  'London','Singapore','Other',
];

const fmt = (val) => val != null ? `₹${(val / 100000).toFixed(1)}L` : '—';
const fmtDate = (dt) => dt ? new Date(dt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

// ─── Company Autocomplete Input ───────────────────────────────────────────────

function CompanyAutocomplete({ value, selectedCompany, onSelect, onClear }) {
  const [query,       setQuery]       = useState(value ?? '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  // Close on outside click
  useEffect(() => {
    function h(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSug(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Sync query when cleared externally
  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  function handleChange(e) {
    const v = e.target.value;
    setQuery(v);
    if (selectedCompany) onClear();
    clearTimeout(debounceRef.current);
    if (v.length < 2) { setSuggestions([]); setShowSug(false); return; }
    debounceRef.current = setTimeout(() => {
      api.get('/public/companies', { params: { name: v, size: 8, page: 0 } })
        .then(r => { setSuggestions(r.data?.data?.content ?? []); setShowSug(true); })
        .catch(console.error);
    }, 300);
  }

  function select(c) {
    setQuery(c.name);
    setSuggestions([]);
    setShowSug(false);
    onSelect(c);
  }

  function handleClear() {
    setQuery('');
    setSuggestions([]);
    setShowSug(false);
    onClear();
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: '1 1 180px', minWidth: 180 }}>
      <div style={{ position: 'relative' }}>
        <input
          style={{ ...styles.filterInput, width: '100%', boxSizing: 'border-box', paddingRight: query ? 30 : 14 }}
          placeholder='🏢  Company name…'
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setShowSug(true)}
          autoComplete='off'
        />
        {query && (
          <button
            onClick={handleClear}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
          >✕</button>
        )}
      </div>
      {showSug && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
          {suggestions.map((c, i) => (
            <div
              key={c.id}
              onClick={() => select(c)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <CompanyLogo companyId={String(c.id)} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={26} radius={6} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
                {c.industry && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.industry}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Job Title Autocomplete Input ─────────────────────────────────────────────

function JobTitleAutocomplete({ value, onSelect, onClear }) {
  const [query,       setQuery]       = useState(value ?? '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  useEffect(() => {
    function h(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSug(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  function handleChange(e) {
    const v = e.target.value;
    setQuery(v);
    onClear();
    clearTimeout(debounceRef.current);
    if (v.length < 2) { setSuggestions([]); setShowSug(false); return; }
    debounceRef.current = setTimeout(() => {
      api.get('/admin/salaries/approved', { params: { jobTitle: v, size: 10, page: 0 } })
        .then(r => {
          const content = r.data?.data?.content ?? [];
          // deduplicate job titles
          const seen = new Set();
          const titles = [];
          content.forEach(e => {
            const t = e.jobTitle?.trim();
            if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); titles.push(t); }
          });
          setSuggestions(titles);
          setShowSug(titles.length > 0);
        })
        .catch(console.error);
    }, 350);
  }

  function select(title) {
    setQuery(title);
    setSuggestions([]);
    setShowSug(false);
    onSelect(title);
  }

  function handleClear() {
    setQuery('');
    setSuggestions([]);
    setShowSug(false);
    onClear();
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: '1 1 180px', minWidth: 180 }}>
      <div style={{ position: 'relative' }}>
        <input
          style={{ ...styles.filterInput, width: '100%', boxSizing: 'border-box', paddingRight: query ? 30 : 14 }}
          placeholder='💼  Job title…'
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setShowSug(true)}
          autoComplete='off'
        />
        {query && (
          <button
            onClick={handleClear}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
          >✕</button>
        )}
      </div>
      {showSug && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
          {suggestions.map((title, i) => (
            <div
              key={title}
              onClick={() => select(title)}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--text-1)', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

function EditDrawer({ entry, onClose, onSaved }) {
  const [form, setForm] = useState({
    jobTitle:            entry.jobTitle            ?? '',
    department:          entry.department          ?? '',
    experienceLevel:     entry.experienceLevel     ?? '',
    location:            entry.location            ?? '',
    yearsOfExperience:   entry.yearsOfExperience   ?? '',
    baseSalary:          entry.baseSalary           ?? '',
    bonus:               entry.bonus               ?? '',
    equity:              entry.equity              ?? '',
    employmentType:      entry.employmentType      ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {};
    if (form.jobTitle)             payload.jobTitle             = form.jobTitle;
    if (form.department)           payload.department           = form.department;
    if (form.experienceLevel)      payload.experienceLevel      = form.experienceLevel;
    if (form.location)             payload.location             = form.location;
    if (form.yearsOfExperience !== '') payload.yearsOfExperience = Number(form.yearsOfExperience);
    if (form.baseSalary  !== '')   payload.baseSalary  = Number(form.baseSalary);
    if (form.bonus       !== '')   payload.bonus       = Number(form.bonus);
    if (form.equity      !== '')   payload.equity      = Number(form.equity);
    if (form.employmentType)       payload.employmentType = form.employmentType;

    try {
      const res = await api.patch(`/admin/salaries/${entry.id}`, payload);
      onSaved(res.data?.data);
    } catch (e) {
      setError(e.response?.data?.error ?? e.message);
    } finally {
      setSaving(false);
    }
  }

  const field = (label, key, type = 'text') => (
    <div style={styles.fieldRow}>
      <label style={styles.fieldLabel}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        style={styles.fieldInput}
      />
    </div>
  );

  const select = (label, key, options) => (
    <div style={styles.fieldRow}>
      <label style={styles.fieldLabel}>{label}</label>
      <select value={form[key]} onChange={e => set(key, e.target.value)} style={styles.fieldInput}>
        <option value=''>— unchanged —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.drawer} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <div style={styles.drawerEyebrow}>Edit Entry</div>
            <div style={styles.drawerTitle}>{entry.companyName}</div>
            <div style={{ color:'var(--text-3)', fontSize:13, marginTop:2 }}>{entry.jobTitle}</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {field('Job Title',           'jobTitle')}
          {field('Department',          'department')}
          {select('Experience Level',   'experienceLevel',      EXPERIENCE_LEVELS)}
          {select('Employment Type',    'employmentType',       EMPLOYMENT_TYPES)}
          {select('Location',           'location',             LOCATION_OPTIONS)}
          {field('Years of Experience', 'yearsOfExperience',    'number')}
          {field('Base Salary (₹)',     'baseSalary',           'number')}
          {field('Bonus (₹)',           'bonus',                'number')}
          {field('Equity (₹)',          'equity',               'number')}
        </div>

        <div style={{ display:'flex', gap:10, marginTop:28, justifyContent:'flex-end' }}>
          <button style={styles.btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={{ ...styles.btnPrimary, opacity: saving ? 0.65 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ entry, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/admin/salaries/${entry.id}`);
      onDeleted(entry.id);
    } catch (e) {
      setError(e.response?.data?.error ?? e.message);
      setDeleting(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={{ ...styles.drawer, maxWidth:440, padding:36 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--text-1)', marginBottom:10 }}>
          Delete Entry?
        </h3>
        <p style={{ color:'var(--text-2)', fontSize:14, marginBottom:6 }}>
          This will permanently remove the approved salary entry for
          <strong style={{ color:'var(--text-1)' }}> {entry.companyName}</strong> — <em>{entry.jobTitle}</em>.
        </p>
        <p style={{ color:'var(--text-3)', fontSize:13, marginBottom:20 }}>
          Analytics caches will be invalidated automatically. This action is audited but cannot be undone.
        </p>
        {error && <div style={{ ...styles.errorBox, marginBottom:16 }}>{error}</div>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button style={styles.btnGhost} onClick={onClose} disabled={deleting}>Cancel</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ padding:'9px 22px', fontSize:13, fontWeight:600, background:'var(--rose-dim)', color:'var(--rose)', border:'1px solid rgba(224,92,122,0.3)', borderRadius:8, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.65 : 1, fontFamily:"'DM Sans',sans-serif" }}
          >
            {deleting ? 'Deleting…' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, totalElements, loading }) {
  // Track selected company object separately (for display)
  const [selectedCompany, setSelectedCompany] = useState(null);

  function handleCompanySelect(company) {
    setSelectedCompany(company);
    onChange({ ...filters, companyId: company.id, companyName: undefined, page: 0 });
  }

  function handleCompanyClear() {
    setSelectedCompany(null);
    onChange({ ...filters, companyId: undefined, companyName: undefined, page: 0 });
  }

  function handleJobTitleSelect(title) {
    onChange({ ...filters, jobTitle: title, page: 0 });
  }

  function handleJobTitleClear() {
    onChange({ ...filters, jobTitle: undefined, page: 0 });
  }

  function handleSelect(key, val) {
    onChange({ ...filters, [key]: val, page: 0 });
  }

  function clearAll() {
    setSelectedCompany(null);
    onChange({ page: 0, size: filters.size ?? DEFAULT_PAGE_SIZE, sort: 'createdAt', direction: 'DESC' });
  }

  const hasFilters = !!(filters.companyId || filters.companyName || filters.jobTitle || filters.location || filters.experienceLevel || filters.employmentType);

  return (
    <div style={styles.filterBar}>
      <div style={styles.filterRow}>
        {/* Company autocomplete */}
        <CompanyAutocomplete
          value={selectedCompany?.name ?? ''}
          selectedCompany={selectedCompany}
          onSelect={handleCompanySelect}
          onClear={handleCompanyClear}
        />

        {/* Job title autocomplete */}
        <JobTitleAutocomplete
          value={filters.jobTitle ?? ''}
          onSelect={handleJobTitleSelect}
          onClear={handleJobTitleClear}
        />

        <select
          style={styles.filterSelect}
          value={filters.location ?? ''}
          onChange={e => handleSelect('location', e.target.value || undefined)}
        >
          <option value=''>All Locations</option>
          {LOCATION_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          style={styles.filterSelect}
          value={filters.experienceLevel ?? ''}
          onChange={e => handleSelect('experienceLevel', e.target.value || undefined)}
        >
          <option value=''>All Levels</option>
          {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          style={styles.filterSelect}
          value={filters.employmentType ?? ''}
          onChange={e => handleSelect('employmentType', e.target.value || undefined)}
        >
          <option value=''>All Employment Types</option>
          {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        {hasFilters && (
          <button style={styles.clearBtn} onClick={clearAll}>✕ Clear</button>
        )}
      </div>
      <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", marginTop:8 }}>
        {loading ? 'Loading…' : `${totalElements.toLocaleString()} approved entr${totalElements === 1 ? 'y' : 'ies'}`}
        {hasFilters && ' (filtered)'}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminApprovedSalaries() {
  const [entries,  setEntries]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const [filters, setFilters] = useState({
    page: 0, size: DEFAULT_PAGE_SIZE, sort: 'createdAt', direction: 'DESC',
  });

  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback((showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);

    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params[k] = v;
    });

    api.get('/admin/salaries/approved', { params })
      .then(r => {
        const paged = r.data?.data;
        setEntries(paged?.content ?? []);
        setTotal(paged?.totalElements ?? 0);
      })
      .catch(e => {
        setError(`Error ${e.response?.status ?? 'network'}: ${e.response?.data?.error ?? e.message}`);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  function handleSaved(updated) {
    setEditing(null);
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
  }

  function handleDeleted(id) {
    setDeleting(null);
    setEntries(prev => prev.filter(e => e.id !== id));
    setTotal(t => t - 1);
  }

  const pageSize    = filters.size ?? DEFAULT_PAGE_SIZE;
  const totalPages  = Math.ceil(total / pageSize);
  const currentPage = filters.page ?? 0;

  return (
    <div className='admin-page-content'>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .apr-row:hover { background: var(--bg-2) !important; }
        .apr-row td { transition: background 0.15s; }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:'var(--gold)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Admin</span>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, color:'var(--text-1)', marginTop:8, letterSpacing:'-0.02em' }}>
          Approved Salaries
          {!loading && <span style={{ fontSize:18, color:'var(--text-3)', marginLeft:10 }}>({total.toLocaleString()})</span>}
        </h2>
        <p style={{ color:'var(--text-3)', fontSize:14, marginTop:4 }}>
          Browse, edit, or delete approved salary entries. All changes are audited and analytics caches are refreshed automatically.
        </p>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        totalElements={total}
        loading={loading}
      />

      {/* Error */}
      {error && (
        <div style={{ padding:'14px 20px', background:'var(--rose-dim)', border:'1px solid rgba(224,92,122,0.2)', borderRadius:12, color:'var(--rose)', fontSize:13, marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {error}
          <button onClick={() => load()} style={{ padding:'4px 12px', fontSize:12, cursor:'pointer', borderRadius:6, border:'1px solid var(--rose)', background:'transparent', color:'var(--rose)' }}>Retry</button>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", fontSize:13, padding:'24px 0' }}>
          <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid var(--border)', borderTopColor:'var(--gold)', animation:'spin 0.7s linear infinite' }} />
          Loading…
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)' }}>
          <div style={{ fontSize:36, marginBottom:14 }}>🔍</div>
          <div style={{ fontSize:18, color:'var(--text-2)' }}>No approved entries found</div>
          <div style={{ fontSize:13, marginTop:6 }}>Try adjusting the filters above</div>
        </div>
      )}

      {/* Table */}
      {!loading && entries.length > 0 && (
        <>
          <div className='salary-table-wrap' style={{ marginTop:16 }}>
            <table className='salary-table'>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Level</th>
                  <th>Location</th>
                  <th>Base</th>
                  <th>Bonus</th>
                  <th>Equity</th>
                  <th>Total Comp</th>
                  <th>YOE</th>
                  <th>Added</th>
                  <th style={{ textAlign:'center', width:120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className='apr-row'>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {/* FIX: pass correct props to CompanyLogo */}
                        <CompanyLogo
                          companyId={e.companyId ? String(e.companyId) : undefined}
                          companyName={e.companyName}
                          logoUrl={e.logoUrl}
                          website={e.website}
                          size={26}
                          radius={6}
                        />
                        <span className='company-name' style={{ fontSize:13 }}>{e.companyName}</span>
                      </div>
                    </td>
                    <td style={{ fontSize:13, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.jobTitle}</td>
                    <td>
                      {e.experienceLevel && (
                        <span style={{ fontSize:11, padding:'2px 7px', borderRadius:99, background:'var(--bg-3)', color:'var(--text-2)', fontFamily:"'JetBrains Mono',monospace", letterSpacing:'0.04em' }}>
                          {e.experienceLevel}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize:13, color:'var(--text-2)' }}>{e.location ?? '—'}</td>
                    <td><div className='salary-amount' style={{ fontSize:14 }}>{fmt(e.baseSalary)}</div></td>
                    <td style={{ fontSize:13, color:'var(--text-3)' }}>{fmt(e.bonus)}</td>
                    <td style={{ fontSize:13, color:'var(--text-3)' }}>{fmt(e.equity)}</td>
                    <td><div className='salary-amount' style={{ fontSize:14, color:'var(--gold)' }}>{fmt(e.totalCompensation)}</div></td>
                    <td style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>
                      {e.yearsOfExperience != null ? `${e.yearsOfExperience}y` : '—'}
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>
                      {fmtDate(e.createdAt)}
                    </td>
                    <td>
                      {/* FIX: buttons always visible, styled like Pending Salaries */}
                      <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                        <button
                          onClick={() => setEditing(e)}
                          title='Edit'
                          style={{
                            padding: '5px 14px', fontSize: 12, fontWeight: 600,
                            background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                            border: '1px solid rgba(99,102,241,0.2)', borderRadius: 7,
                            cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                            transition: 'opacity 0.2s ease',
                          }}
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => setDeleting(e)}
                          title='Delete'
                          style={{
                            padding: '5px 14px', fontSize: 12, fontWeight: 600,
                            background: 'var(--rose-dim)', color: 'var(--rose)',
                            border: '1px solid rgba(224,92,122,0.2)', borderRadius: 7,
                            cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                            transition: 'opacity 0.2s ease',
                          }}
                        >
                          ✕ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination + page size selector */}
          <div className='pagination' style={{ marginTop:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <span className='page-info'>
              Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, total)} of {total.toLocaleString()}
            </span>

            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              {/* Rows per page */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", whiteSpace:'nowrap' }}>Rows per page</span>
                <select
                  value={pageSize}
                  onChange={e => setFilters(f => ({ ...f, size: Number(e.target.value), page: 0 }))}
                  style={{ padding:'4px 10px', fontSize:12, background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:7, color:'var(--text-1)', fontFamily:"'JetBrains Mono',monospace", cursor:'pointer', outline:'none' }}
                >
                  {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Page nav */}
              {totalPages > 1 && (
                <div className='page-btns'>
                  <button className='page-btn' disabled={currentPage === 0} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>←</button>
                  <span style={{ padding:'4px 12px', fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'var(--text-3)' }}>
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button className='page-btn' disabled={currentPage + 1 >= totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>→</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Edit drawer */}
      {editing && (
        <EditDrawer
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete modal */}
      {deleting && (
        <DeleteModal
          entry={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  filterBar: {
    marginBottom: 20,
    padding: '16px 20px',
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 14,
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  filterInput: {
    padding: '8px 14px',
    fontSize: 13,
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-1)',
    fontFamily: "'DM Sans',sans-serif",
    outline: 'none',
  },
  filterSelect: {
    padding: '8px 14px',
    fontSize: 13,
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-1)',
    fontFamily: "'DM Sans',sans-serif",
    cursor: 'pointer',
    flex: '1 1 160px',
    outline: 'none',
  },
  clearBtn: {
    padding: '8px 14px',
    fontSize: 12,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-3)',
    cursor: 'pointer',
    fontFamily: "'DM Sans',sans-serif",
    whiteSpace: 'nowrap',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(6px)',
    zIndex: 400,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  drawer: {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: '20px 0 0 20px',
    padding: '40px 36px',
    width: 480,
    maxWidth: '92vw',
    minHeight: '100vh',
    overflowY: 'auto',
  },
  drawerEyebrow: {
    fontFamily: "'JetBrains Mono',monospace",
    fontSize: 11,
    color: 'var(--gold)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  drawerTitle: {
    fontFamily: "'Playfair Display',serif",
    fontSize: 24,
    color: 'var(--text-1)',
    letterSpacing: '-0.02em',
  },
  closeBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-3)',
    cursor: 'pointer',
    fontSize: 16,
    padding: '6px 10px',
    flexShrink: 0,
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-3)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontFamily: "'JetBrains Mono',monospace",
  },
  fieldInput: {
    padding: '9px 14px',
    fontSize: 14,
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-1)',
    fontFamily: "'DM Sans',sans-serif",
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  btnGhost: {
    padding: '9px 20px',
    fontSize: 13,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-2)',
    cursor: 'pointer',
    fontFamily: "'DM Sans',sans-serif",
  },
  btnPrimary: {
    padding: '9px 22px',
    fontSize: 13,
    fontWeight: 600,
    background: 'var(--gold)',
    color: '#0f172a',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontFamily: "'DM Sans',sans-serif",
  },
  errorBox: {
    padding: '10px 16px',
    background: 'var(--rose-dim)',
    border: '1px solid rgba(224,92,122,0.2)',
    borderRadius: 8,
    color: 'var(--rose)',
    fontSize: 13,
    marginBottom: 16,
  },
};

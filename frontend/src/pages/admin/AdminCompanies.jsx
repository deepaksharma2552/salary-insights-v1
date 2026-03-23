import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import TopProgressBar from '../../components/shared/TopProgressBar';

const BENEFIT_PRESETS = [
  'ESOPs', 'Health insurance', 'Dental & vision', 'Relocation',
  'Learning budget', 'Meal allowance', 'WFH / Remote', 'Parental leave', 'Gym / wellness',
];

const EMPTY = { name: '', industry: '', website: '', description: '', benefits: [] };
const SEARCH_MIN  = 3;
const SEARCH_WAIT = 600;
const SIZE_OPTIONS = [10, 25, 50];

function PagePills({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const delta = 2;
  const pages = [];
  const left  = Math.max(0, page - delta);
  const right = Math.min(totalPages - 1, page + delta);
  if (left > 0)               pages.push({ type: 'num', n: 0 });
  if (left > 1)               pages.push({ type: 'ellipsis', key: 'l' });
  for (let i = left; i <= right; i++) pages.push({ type: 'num', n: i });
  if (right < totalPages - 2) pages.push({ type: 'ellipsis', key: 'r' });
  if (right < totalPages - 1) pages.push({ type: 'num', n: totalPages - 1 });
  return (
    <>
      {pages.map((p, i) =>
        p.type === 'ellipsis' ? (
          <span key={p.key} style={{ padding: '0 4px', color: 'var(--text-3)', fontSize: 13 }}>…</span>
        ) : (
          <button key={p.n} onClick={() => onChange(p.n)} className={`page-btn${p.n === page ? ' active' : ''}`}>{p.n + 1}</button>
        )
      )}
    </>
  );
}

// ── Benefits editor component ────────────────────────────────────────────────
function BenefitsEditor({ benefits, onChange }) {
  // benefits: [{ name, amount }]

  function addBlank() {
    onChange([...benefits, { name: '', amount: '' }]);
  }

  function addPreset(name) {
    if (benefits.some(b => b.name.toLowerCase() === name.toLowerCase())) return;
    onChange([...benefits, { name, amount: '' }]);
  }

  function update(index, field, value) {
    const next = benefits.map((b, i) => i === index ? { ...b, [field]: value } : b);
    onChange(next);
  }

  function remove(index) {
    onChange(benefits.filter((_, i) => i !== index));
  }

  const availablePresets = BENEFIT_PRESETS.filter(
    p => !benefits.some(b => b.name.toLowerCase() === p.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Column headers */}
      {benefits.length > 0 && (
        <div style={{ display: 'flex', gap: 8, paddingLeft: 4, paddingRight: 32 }}>
          <div style={{ flex: 1, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Benefit name</div>
          <div style={{ width: 140, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Amount (optional)</div>
        </div>
      )}

      {/* Benefit rows */}
      {benefits.map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            className="form-input"
            placeholder="e.g. Health insurance"
            value={b.name}
            onChange={e => update(i, 'name', e.target.value)}
            style={{ flex: 1, padding: '7px 10px', fontSize: 13 }}
          />
          <input
            className="form-input"
            placeholder="e.g. ₹5L/yr"
            value={b.amount ?? ''}
            onChange={e => update(i, 'amount', e.target.value)}
            style={{ width: 140, padding: '7px 10px', fontSize: 13, flexShrink: 0 }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            style={{ width: 28, height: 28, borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--rose-dim)'; e.currentTarget.style.color = 'var(--rose)'; e.currentTarget.style.borderColor = 'rgba(224,92,122,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >×</button>
        </div>
      ))}

      {/* Add benefit button */}
      <button
        type="button"
        onClick={addBlank}
        style={{ fontSize: 12, fontWeight: 500, color: '#3b82f6', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >+ Add benefit</button>

      {/* Preset chips */}
      {availablePresets.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 6 }}>Quick add</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {availablePresets.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => addPreset(p)}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
              >+ {p}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminCompanies() {
  const [companies,  setCompanies]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [search,     setSearch]     = useState('');
  const debounceRef  = useRef(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const load = useCallback(() => {
    setLoading(true); setLoadError(null); TopProgressBar.start();
    const params = { page, size };
    if (search) params.name = search;
    api.get('/admin/companies', { params })
      .then(r => {
        const d = r.data?.data;
        setCompanies(d?.content ?? []);
        setTotal(d?.totalElements ?? 0);
        setTotalPages(d?.totalPages ?? 0);
        setLoadError(null);
      })
      .catch(err => setLoadError(`${err.response?.status ?? 'Network error'}: ${err.response?.data?.message ?? err.message}`))
      .finally(() => { setLoading(false); TopProgressBar.done(); });
  }, [page, size, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function commitSearch(val) { clearTimeout(debounceRef.current); setSearch(val); setPage(0); }
  function handleSearchChange(e) {
    const val = e.target.value;
    setInputValue(val);
    clearTimeout(debounceRef.current);
    if (val.length === 0) { commitSearch(''); return; }
    if (val.length < SEARCH_MIN) return;
    debounceRef.current = setTimeout(() => commitSearch(val), SEARCH_WAIT);
  }
  function handleSearchKey(e) { if (e.key === 'Enter' && inputValue.length >= SEARCH_MIN) commitSearch(inputValue); }
  function clearSearch() { setInputValue(''); commitSearch(''); }
  function handleSizeChange(newSize) { setSize(newSize); setPage(0); }

  // Normalize benefits from API — could be string[] (legacy) or BenefitItem[]
  function normalizeBenefits(raw) {
    if (!raw || raw.length === 0) return [];
    return raw.map(b => typeof b === 'string' ? { name: b, amount: '' } : { name: b.name ?? '', amount: b.amount ?? '' });
  }

  function openCreate() { setForm(EMPTY); setModal('create'); setError(''); }
  function openEdit(c) {
    setForm({
      name: c.name, industry: c.industry ?? '', website: c.website ?? '',
      description: c.description ?? '',
      benefits: normalizeBenefits(c.benefits),
    });
    setModal(c); setError('');
  }

  async function save() {
    setSaving(true); setError(''); TopProgressBar.start();
    try {
      // Strip empty-name rows and clean up amount field before saving
      const cleanBenefits = (form.benefits ?? [])
        .filter(b => b.name.trim() !== '')
        .map(b => ({ name: b.name.trim(), amount: b.amount?.trim() || null }));
      const payload = { ...form, benefits: cleanBenefits };
      if (modal === 'create') await api.post('/admin/companies', payload);
      else                    await api.put(`/admin/companies/${modal.id}`, payload);
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false); TopProgressBar.done();
    }
  }

  async function toggleStatus(c) { TopProgressBar.start(); await api.patch(`/admin/companies/${c.id}/toggle-status`); TopProgressBar.done(); load(); }
  async function del(id) { if (!window.confirm('Delete this company?')) return; TopProgressBar.start(); await api.delete(`/admin/companies/${id}`); TopProgressBar.done(); load(); }

  const start = page * size + 1;
  const end   = Math.min((page + 1) * size, total);
  const showingHint = inputValue.length > 0 && inputValue.length < SEARCH_MIN
    ? `Type ${SEARCH_MIN - inputValue.length} more character${SEARCH_MIN - inputValue.length !== 1 ? 's' : ''} to search`
    : null;
  const showEnterHint = inputValue.length >= SEARCH_MIN && inputValue !== search;

  return (
    <div className="admin-page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>Companies</h2>
        </div>
        <button className="btn-primary" style={{ padding: '10px 22px' }} onClick={openCreate}>+ Add Company</button>
      </div>

      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="search-box" style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="input-field" value={inputValue} onChange={handleSearchChange} onKeyDown={handleSearchKey} placeholder="Search companies… (3+ chars)" autoComplete="off" />
          {showEnterHint && (
            <span onClick={() => commitSearch(inputValue)} style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#3b82f6', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap', padding: '2px 7px', background: 'rgba(59,130,246,0.1)', borderRadius: 5 }}>↵ Search</span>
          )}
          {inputValue && <span onClick={clearSearch} style={{ flexShrink: 0, cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Rows:</span>
          {SIZE_OPTIONS.map(s => (
            <button key={s} onClick={() => handleSizeChange(s)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: size === s ? '#3b82f6' : 'var(--bg-2)', color: size === s ? '#fff' : 'var(--text-3)', border: size === s ? '1px solid #3b82f6' : '1px solid var(--border)', transition: 'all 0.12s' }}>{s}</button>
          ))}
        </div>
      </div>

      {showingHint && <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, marginLeft: 2, fontFamily: "'JetBrains Mono',monospace" }}>{showingHint}</div>}

      {loadError && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 12, color: 'var(--rose)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 16 }}>⚠</span><span>{loadError}</span>
          <button onClick={load} style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'rgba(224,92,122,0.15)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.3)', borderRadius: 6, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {!loadError && (
        loading ? (
          <div style={{ padding: '32px 0 30px' }}>
            <div style={{ width: '100%', height: 3, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius: 99, animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
            </div>
            <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
          </div>
        ) : (
          <>
            <div className="salary-table-wrap">
              <table className="salary-table">
                <thead>
                  <tr>
                    <th>Company</th><th>Industry</th><th>Website</th><th>Benefits</th><th>Status</th><th style={{ width: 180 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontStyle: 'italic' }}>{search ? `No companies match "${search}"` : 'No companies yet.'}</td></tr>
                  ) : companies.map(c => (
                    <tr key={c.id}>
                      <td><div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</div></td>
                      <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{c.industry ?? '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {c.website ? <a href={c.website} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>{c.website.replace(/^https?:\/\//, '')}</a> : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {c.benefits && c.benefits.length > 0
                          ? `${c.benefits.length} benefit${c.benefits.length !== 1 ? 's' : ''}`
                          : <span style={{ fontStyle: 'italic' }}>None</span>}
                      </td>
                      <td><span className={`status-badge ${c.status === 'ACTIVE' ? 'status-approved' : 'status-rejected'}`}>{c.status === 'ACTIVE' ? '● Active' : '● Inactive'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="view-btn" onClick={() => openEdit(c)}>Edit</button>
                          <button onClick={() => toggleStatus(c)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'var(--ink-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>{c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
                          <button onClick={() => del(c.id)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 6, cursor: 'pointer' }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="pagination">
                <span className="page-info">
                  {total === 0 ? 'No results' : `Showing ${start}–${end} of ${total} compan${total !== 1 ? 'ies' : 'y'}`}
                  {search && <span style={{ marginLeft: 6, color: '#3b82f6', fontWeight: 500 }}>for "{search}"</span>}
                </span>
                <div className="page-btns">
                  <button className="page-btn" disabled={page === 0} onClick={() => setPage(0)} title="First">«</button>
                  <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)} title="Previous">‹</button>
                  <PagePills page={page} totalPages={totalPages} onChange={setPage} />
                  <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} title="Next">›</button>
                  <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} title="Last">»</button>
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* ── Create / Edit Modal ── */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModal(null)}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, width: 560, maxWidth: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: 'var(--text-1)' }}>
                {modal === 'create' ? 'Add Company' : `Edit — ${modal.name}`}
              </h3>
            </div>

            {/* Modal body — scrollable */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 32px' }}>
              {error && <div style={{ padding: '10px 14px', background: 'var(--rose-dim)', color: 'var(--rose)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { name: 'name',        label: 'Company Name *', placeholder: 'e.g. Acme Corp' },
                  { name: 'industry',    label: 'Industry',       placeholder: 'e.g. Fintech' },
                  { name: 'website',     label: 'Website',        placeholder: 'https://...' },
                  { name: 'description', label: 'Description',    placeholder: 'Brief description…', textarea: true },
                ].map(f => (
                  <div key={f.name} className="form-group">
                    <label className="form-label">{f.label}</label>
                    {f.textarea
                      ? <textarea className="form-input" rows={3} placeholder={f.placeholder} value={form[f.name]} onChange={e => setForm(x => ({ ...x, [f.name]: e.target.value }))} style={{ resize: 'vertical' }} />
                      : <input className="form-input" placeholder={f.placeholder} value={form[f.name]} onChange={e => setForm(x => ({ ...x, [f.name]: e.target.value }))} />
                    }
                  </div>
                ))}

                {/* Benefits editor */}
                <div className="form-group">
                  <label className="form-label">Benefits</label>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
                    Source from the company's official benefits page. Amount is optional (e.g. "₹5L/yr", "Varies", "26 weeks").
                  </div>
                  <BenefitsEditor
                    benefits={form.benefits ?? []}
                    onChange={benefits => setForm(x => ({ ...x, benefits }))}
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '16px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

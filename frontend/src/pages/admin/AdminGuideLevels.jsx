import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import TopProgressBar from '../../components/shared/TopProgressBar';

/* ─── tiny helpers ───────────────────────────────────────────────────────── */
function Tag({ label, color = 'var(--teal)', bg = 'var(--teal-dim)', border = 'rgba(62,207,176,0.2)' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      color, background: bg, border: `1px solid ${border}`,
      fontFamily: "'JetBrains Mono',monospace",
    }}>{label}</span>
  );
}

function AdminHeader({ label, title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
      <div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: 'var(--text-1)', marginTop: 6, letterSpacing: '-0.02em' }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, padding: 36, width, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: 'var(--text-1)', marginBottom: 20 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 1 — Standard Levels
═══════════════════════════════════════════════════════════════════════════ */
function StandardLevelsTab() {
  const [levels,  setLevels]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | 'create' | level obj
  const [form,    setForm]    = useState({ name: '', rank: '', description: '' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/guide-levels/standard')
      .then(r => { const lvls = r.data?.data ?? []; console.log('[AdminGuideLevels/standard] loaded:', lvls.length, 'levels'); setLevels(lvls); })
      .catch(err => { console.error('[AdminGuideLevels/standard] error:', err.response?.status, err.response?.data); setError(err.response?.data?.message ?? `Load failed (${err.response?.status ?? 'network error'})`); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm({ name: '', rank: levels.length + 1, description: '' }); setModal('create'); setError(''); }
  function openEdit(l)  { setForm({ name: l.name, rank: l.rank, description: l.description ?? '' }); setModal(l); setError(''); }

  async function save() {
    setSaving(true); setError(''); TopProgressBar.start();
    try {
      const payload = { name: form.name.trim(), rank: Number(form.rank), description: form.description || null };
      if (modal === 'create') await api.post('/admin/guide-levels/standard', payload);
      else                    await api.put(`/admin/guide-levels/standard/${modal.id}`, payload);
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.message ?? 'Save failed'); }
    finally { setSaving(false); TopProgressBar.done(); }
  }

  async function del(id) {
    if (!window.confirm('Delete this standard level? This will also remove any company mappings.')) return;
    try { await api.delete(`/admin/guide-levels/standard/${id}`); load(); }
    catch (e) { alert(e.response?.data?.message ?? 'Delete failed — it may still have mappings.'); }
  }

  return (
    <div>
      <AdminHeader label="Level Guide" title="Standard Levels"
        action={
          <button onClick={openCreate} style={{ padding: '9px 20px', borderRadius: 9, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            + Add Level
          </button>
        }
      />
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
        Define the universal benchmark ladder — these are the "rows" in the public Level Guide comparison grid.
        Rank determines ordering (lower = more junior).
      </p>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading…</div>
      ) : levels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div>No standard levels yet. Add one to get started.</div>
        </div>
      ) : (
        <div className="salary-table-wrap">
          <table className="salary-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rank</th>
                <th>Name</th>
                <th>Description</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {levels.map(l => (
                <tr key={l.id}>
                  <td>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>
                      #{l.rank}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{l.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{l.description || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => openEdit(l)} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => del(l.id)} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Add Standard Level' : 'Edit Standard Level'} onClose={() => setModal(null)}>
          {error && <div style={{ padding: '10px 14px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 8, color: 'var(--rose)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Senior Engineer" />
            </div>
            <div>
              <label className="form-label">Rank * <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>(lower = more junior)</span></label>
              <input className="form-input" type="number" min={1} value={form.rank} onChange={e => setForm(f => ({ ...f, rank: e.target.value }))} placeholder="e.g. 4" />
            </div>
            <div>
              <label className="form-label">Description <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>(optional)</span></label>
              <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Scope/responsibilities hint shown in the public grid" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name.trim() || !form.rank} style={{ padding: '9px 22px', fontSize: 13, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.65 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB 2 — Company Levels & Mappings
   Company picker → shows that company's internal titles + their mapped level
═══════════════════════════════════════════════════════════════════════════ */
function CompanyLevelsTab({ standardLevels }) {
  // Company autocomplete
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selCompany,  setSelCompany]  = useState(null);
  const [showSug,     setShowSug]     = useState(false);
  const searchRef   = useRef(null);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  // Company levels state
  const [levels,  setLevels]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [mapModal, setMapModal] = useState(null); // company level obj
  const [newTitle, setNewTitle]   = useState('');
  const [newDesc,  setNewDesc]    = useState('');
  const [newFn,    setNewFn]      = useState('Engineering');
  const [selStdId, setSelStdId] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  // Close autocomplete on outside click
  useEffect(() => {
    function h(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSug(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function searchCompanies(q) {
    if (q.length < 2) { setSuggestions([]); setShowSug(false); return; }
    api.get('/public/companies', { params: { name: q, size: 8, page: 0 } })
      .then(r => { setSuggestions(r.data?.data?.content ?? []); setShowSug(true); })
      .catch(console.error);
  }

  function handleQueryChange(e) {
    const v = e.target.value;
    setQuery(v);
    setSelCompany(null);
    setLevels([]);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCompanies(v), 300);
  }

  function selectCompany(c) {
    setSelCompany(c);
    setQuery(c.name);
    setShowSug(false);
    setSuggestions([]);
    loadLevels(c.id);
  }

  const loadLevels = useCallback((companyId) => {
    setLoading(true);
    api.get(`/admin/guide-levels/company/${companyId}`)
      .then(r => { const lvls = r.data?.data ?? []; console.log('[AdminGuideLevels/company] loaded:', lvls.length, 'levels'); setLevels(lvls); })
      .catch(err => { console.error('[AdminGuideLevels/company] error:', err.response?.status); setError(err.response?.data?.message ?? `Load failed (${err.response?.status ?? 'network error'})`); })
      .finally(() => setLoading(false));
  }, []);

  async function addLevel() {
    if (!newTitle.trim()) return;
    setSaving(true); setError(''); TopProgressBar.start();
    try {
      await api.post('/admin/guide-levels/company', {
        companyId: selCompany.id,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        functionCategory: newFn,
      });
      setAddModal(false); setNewTitle(''); setNewDesc(''); setNewFn('Engineering');
      loadLevels(selCompany.id);
    } catch (e) { setError(e.response?.data?.message ?? 'Add failed'); }
    finally { setSaving(false); TopProgressBar.done(); }
  }

  async function delLevel(id) {
    if (!window.confirm('Delete this level and its mapping?')) return;
    await api.delete(`/admin/guide-levels/company/${id}`);
    loadLevels(selCompany.id);
  }

  async function saveMapping() {
    if (!selStdId) return;
    setSaving(true); setError(''); TopProgressBar.start();
    try {
      await api.post('/admin/guide-levels/mappings', {
        guideCompanyLevelId: mapModal.id,
        guideStandardLevelId: selStdId,
      });
      setMapModal(null); setSelStdId('');
      loadLevels(selCompany.id);
    } catch (e) { setError(e.response?.data?.message ?? 'Mapping failed'); }
    finally { setSaving(false); TopProgressBar.done(); }
  }

  async function removeMapping(companyLevelId) {
    await api.delete(`/admin/guide-levels/mappings/company-level/${companyLevelId}`);
    loadLevels(selCompany.id);
  }

  return (
    <div>
      <AdminHeader label="Level Guide" title="Company Levels & Mappings" />
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
        Search for a company, add its internal level titles, then map each title to a standard level.
      </p>

      {/* Company search */}
      <div ref={wrapRef} style={{ position: 'relative', maxWidth: 400, marginBottom: 32 }}>
        <label className="form-label">Select Company</label>
        <input
          ref={searchRef}
          className="form-input"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => suggestions.length > 0 && setShowSug(true)}
          placeholder="Type company name…"
          autoComplete="off"
        />
        {showSug && suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' }}>
            {suggestions.map((c, i) => (
              <div key={c.id} onClick={() => selectCompany(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={28} radius={6} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
                  {c.industry && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.industry}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Levels table for selected company */}
      {selCompany && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <CompanyLogo companyId={selCompany.id} companyName={selCompany.name} logoUrl={selCompany.logoUrl} website={selCompany.website} size={32} radius={8} />
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>{selCompany.name}</span>
            <button onClick={() => { setAddModal(true); setError(''); }} style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              + Add Level
            </button>
          </div>

          {loading ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>Loading…</div>
          ) : levels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>
              No levels added yet for {selCompany.name}. Add the first one.
            </div>
          ) : (
            <div className="salary-table-wrap">
              <table className="salary-table">
                <thead>
                  <tr>
                    <th>Internal Title</th>
                    <th>Function</th>
                    <th>Description</th>
                    <th>Mapped To</th>
                    <th style={{ width: 150 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {levels.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-1)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>{l.title}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                          background: l.functionCategory === 'Product' ? '#8b5cf618' : l.functionCategory === 'Program' ? '#06b6d418' : '#3b82f618',
                          color:      l.functionCategory === 'Product' ? '#8b5cf6'   : l.functionCategory === 'Program' ? '#06b6d4'   : '#3b82f6',
                          border:     `1px solid ${l.functionCategory === 'Product' ? '#8b5cf640' : l.functionCategory === 'Program' ? '#06b6d440' : '#3b82f640'}`,
                          fontFamily: "'JetBrains Mono',monospace",
                        }}>
                          {l.functionCategory || 'Engineering'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{l.description || '—'}</td>
                      <td>
                        {l.mappedStandardLevelName ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tag label={`#${l.mappedStandardLevelRank} ${l.mappedStandardLevelName}`} />
                            <button onClick={() => removeMapping(l.id)} style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--rose)', fontStyle: 'italic' }}>Not mapped</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setMapModal(l); setSelStdId(l.mappedStandardLevelId ?? ''); setError(''); }}
                            style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, cursor: 'pointer' }}>
                            {l.mappedStandardLevelName ? 'Remap' : 'Map'}
                          </button>
                          <button onClick={() => delLevel(l.id)} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 6, cursor: 'pointer' }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add level modal */}
      {addModal && (
        <Modal title={`Add Level — ${selCompany?.name}`} onClose={() => setAddModal(false)}>
          {error && <div style={{ padding: '10px 14px', background: 'var(--rose-dim)', borderRadius: 8, color: 'var(--rose)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Function Track *</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {['Engineering', 'Product', 'Program'].map(fn => (
                  <button key={fn} type="button" onClick={() => setNewFn(fn)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.12s',
                    background: newFn === fn ? '#3b82f6' : 'var(--bg-2)',
                    color: newFn === fn ? '#fff' : 'var(--text-3)',
                    border: newFn === fn ? '1px solid #3b82f6' : '1px solid var(--border)',
                  }}>{fn}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Internal Title *</label>
              <input className="form-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. MTS, SDE II, L5, PM II, TPM" autoFocus />
            </div>
            <div>
              <label className="form-label">Description <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>(optional)</span></label>
              <input className="form-input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="e.g. Member of Technical Staff" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button className="btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
              <button onClick={addLevel} disabled={saving || !newTitle.trim()} style={{ padding: '9px 22px', fontSize: 13, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.65 : 1 }}>
                {saving ? 'Adding…' : 'Add Level'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Map level modal */}
      {mapModal && (
        <Modal title={`Map "${mapModal.title}"`} onClose={() => setMapModal(null)}>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            Select the standard benchmark level that best matches <strong style={{ color: 'var(--text-1)' }}>{selCompany?.name} · {mapModal.title}</strong>
          </p>
          {error && <div style={{ padding: '10px 14px', background: 'var(--rose-dim)', borderRadius: 8, color: 'var(--rose)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {standardLevels.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No standard levels defined yet. Add them in the Standard Levels tab first.</div>
            )}
            {standardLevels.map(sl => (
              <label key={sl.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${selStdId === sl.id ? '#3b82f6' : 'var(--border)'}`, background: selStdId === sl.id ? 'rgba(59,130,246,0.06)' : 'transparent', cursor: 'pointer', transition: 'all 0.12s' }}>
                <input type="radio" name="stdLevel" value={sl.id} checked={selStdId === sl.id} onChange={() => setSelStdId(sl.id)} style={{ accentColor: '#3b82f6' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>#{sl.rank} {sl.name}</div>
                  {sl.description && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sl.description}</div>}
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn-ghost" onClick={() => setMapModal(null)}>Cancel</button>
            <button onClick={saveMapping} disabled={saving || !selStdId} style={{ padding: '9px 22px', fontSize: 13, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', opacity: (!selStdId || saving) ? 0.5 : 1 }}>
              {saving ? 'Saving…' : 'Save Mapping'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE — tabs
═══════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'standard', label: '📋 Standard Levels' },
  { id: 'company',  label: '🏢 Company Levels & Mappings' },
];

export default function AdminGuideLevels() {
  const [activeTab,     setActiveTab]     = useState('standard');
  const [standardLevels, setStandardLevels] = useState([]);

  // Load standard levels once — shared by both tabs (Company tab needs them for the mapping modal)
  useEffect(() => {
    api.get('/admin/guide-levels/standard')
      .then(r => setStandardLevels(r.data?.data ?? []))
      .catch(err => console.error('Standard levels load failed:', err.response?.status, err.response?.data?.message ?? err.message));
  }, []);

  return (
    <div style={{ padding: 40 }}>
      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 36, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { TopProgressBar.start(); setActiveTab(t.id); setTimeout(() => TopProgressBar.done(), 120); }} style={{
            padding: '9px 20px', fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
            background: 'none', border: 'none', cursor: 'pointer',
            color: activeTab === t.id ? '#3b82f6' : 'var(--text-3)',
            borderBottom: activeTab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'standard' && <StandardLevelsTab />}
      {activeTab === 'company'  && <CompanyLevelsTab standardLevels={standardLevels} />}
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { useAppData } from '../../context/AppDataContext';
import CompanyLogo from '../../components/shared/CompanyLogo';
import TopProgressBar from '../../components/shared/TopProgressBar';

/* ─── tiny helpers ───────────────────────────────────────────────────────── */
function Tag({ label, color = 'var(--blue)', bg = 'var(--blue-dim)', border = 'rgba(59,130,246,0.2)' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      color, background: bg, border: `1px solid ${border}`,
      fontFamily: "'IBM Plex Mono',monospace",
    }}>{label}</span>
  );
}

const FN_COLOURS = ['#3b82f6','#8b5cf6','#06b6d4','#f59e0b','#10b981','#ef4444','#ec4899'];
function fnCategoryStyle(name) {
  if (!name) return { background: 'var(--bg-2)', color: 'var(--text-3)', border: '1px solid var(--border)' };
  const idx = Math.abs([...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)) % FN_COLOURS.length;
  const hex = FN_COLOURS[idx];
  return { background: hex + '18', color: hex, border: `1px solid ${hex}40` };
}

function AdminHeader({ label, title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
      <div>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: 'var(--blue)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', marginTop: 4, letterSpacing: '-0.02em' }}>{title}</h2>
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
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 20 }}>{title}</h3>
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
        <div style={{ color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>Loading…</div>
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
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>
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
  const { functions: jobFunctions } = useAppData();
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
  const [addModal,  setAddModal]  = useState(false);
  const [mapModal,  setMapModal]  = useState(null); // company level obj
  const [newTitle,  setNewTitle]  = useState('');
  const [newDesc,   setNewDesc]   = useState('');
  const [newFn,     setNewFn]     = useState('');
  // overlap mapping state: [{stdId, pct}]
  const [entries,   setEntries]   = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

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
      setAddModal(false); setNewTitle(''); setNewDesc(''); setNewFn(jobFunctions[0]?.displayName ?? '');
      loadLevels(selCompany.id);
    } catch (e) { setError(e.response?.data?.message ?? 'Add failed'); }
    finally { setSaving(false); TopProgressBar.done(); }
  }

  async function delLevel(id) {
    if (!window.confirm('Delete this level and its mapping?')) return;
    await api.delete(`/admin/guide-levels/company/${id}`);
    loadLevels(selCompany.id);
  }

  function remainingPct() {
    return 100 - entries.reduce((s, e) => s + e.pct, 0);
  }

  function addEntry(stdId) {
    const rem = remainingPct();
    if (rem <= 0) return;
    setEntries(prev => [...prev, { stdId, pct: Math.min(rem, 20) }]);
  }

  function removeEntry(idx) {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  }

  function updateEntry(idx, field, val) {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  }

  async function saveOverlapMappings() {
    const rem = remainingPct();
    if (rem !== 0) { setError(`Percentages must sum to 100. Currently ${100 - rem}% allocated.`); return; }
    if (entries.length === 0) { setError('Add at least one level mapping.'); return; }
    setSaving(true); setError(''); TopProgressBar.start();
    try {
      await api.post('/admin/guide-levels/mappings', {
        guideCompanyLevelId: mapModal.id,
        entries: entries.map(e => ({ guideStandardLevelId: e.stdId, overlapPct: e.pct })),
      });
      setMapModal(null); setEntries([]);
      loadLevels(selCompany.id);
    } catch (e) { setError(e.response?.data?.message ?? 'Mapping failed'); }
    finally { setSaving(false); TopProgressBar.done(); }
  }

  async function removeAllMappings(companyLevelId) {
    TopProgressBar.start();
    await api.delete(`/admin/guide-levels/mappings/company-level/${companyLevelId}`);
    TopProgressBar.done();
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
            <div style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: "'IBM Plex Mono',monospace" }}>Loading…</div>
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
                      <td style={{ fontWeight: 600, color: 'var(--text-1)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>{l.title}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                          ...fnCategoryStyle(l.functionCategory),
                          fontFamily: "'IBM Plex Mono',monospace",
                        }}>
                          {l.functionCategory ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{l.description || '—'}</td>
                      <td>
                        {l.mappings && l.mappings.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                            {l.mappings.map((m, mi) => (
                              <span key={mi} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: 'var(--blue-dim)', color: 'var(--blue)', border: '1px solid rgba(59,130,246,0.2)', fontFamily: "'IBM Plex Mono',monospace" }}>
                                {m.overlapPct < 100 && <span style={{ opacity: .7 }}>{m.overlapPct}%</span>}
                                {m.standardLevelName}
                              </span>
                            ))}
                            <button onClick={() => removeAllMappings(l.id)} style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--rose)', fontStyle: 'italic' }}>Not mapped</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => {
                              setMapModal(l);
                              setEntries((l.mappings ?? []).map(m => ({ stdId: m.standardLevelId, pct: m.overlapPct })));
                              setError('');
                            }}
                            style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, cursor: 'pointer' }}>
                            {l.mappings && l.mappings.length > 0 ? 'Remap' : 'Map'}
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
                {jobFunctions.map(fn => (
                  <button key={fn.id} type="button" onClick={() => setNewFn(fn.displayName)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.12s',
                    background: newFn === fn.displayName ? '#3b82f6' : 'var(--bg-2)',
                    color: newFn === fn.displayName ? '#fff' : 'var(--text-3)',
                    border: newFn === fn.displayName ? '1px solid #3b82f6' : '1px solid var(--border)',
                  }}>{fn.displayName}</button>
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

      {/* Map level modal — overlap percentages */}
      {mapModal && (() => {
        const rem = remainingPct();
        const usedIds = new Set(entries.map(e => e.stdId));
        const availLevels = standardLevels.filter(sl => !usedIds.has(sl.id));
        return (
          <Modal title={`Map "${mapModal.title}"`} onClose={() => { setMapModal(null); setEntries([]); }} width={520}>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
              Set how <strong style={{ color: 'var(--text-1)' }}>{selCompany?.name} · {mapModal.title}</strong> maps across standard levels.
              Percentages must sum to <strong style={{ color: 'var(--text-1)' }}>100%</strong>.
            </p>
            {error && <div style={{ padding: '10px 14px', background: 'var(--rose-dim)', borderRadius: 8, color: 'var(--rose)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            {/* Allocated progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: rem === 0 ? '#16a34a' : rem < 0 ? 'var(--rose)' : 'var(--text-3)', marginBottom: 4 }}>
                <span>{100 - rem}% allocated</span>
                <span style={{ fontWeight: 600 }}>{rem === 0 ? '✓ Ready to save' : rem > 0 ? `${rem}% remaining` : `${Math.abs(rem)}% over`}</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100 - rem, 100)}%`, background: rem === 0 ? '#16a34a' : rem < 0 ? 'var(--rose)' : '#3b82f6', borderRadius: 99, transition: 'width .2s, background .2s' }} />
              </div>
            </div>

            {/* Mapping entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {entries.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No mappings yet — add one below.</div>
              )}
              {entries.map((entry, idx) => {
                const sl = standardLevels.find(s => s.id === entry.stdId);
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <select
                      value={entry.stdId}
                      onChange={e => updateEntry(idx, 'stdId', e.target.value)}
                      className="form-input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
                    >
                      {standardLevels.filter(sl => !usedIds.has(sl.id) || sl.id === entry.stdId).map(sl => (
                        <option key={sl.id} value={sl.id}>#{sl.rank} {sl.name}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <input
                        type="range" min={5} max={100} step={5}
                        value={entry.pct}
                        onChange={e => updateEntry(idx, 'pct', Number(e.target.value))}
                        style={{ width: 88 }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', minWidth: 36, textAlign: 'right', fontFamily: "'IBM Plex Mono',monospace" }}>{entry.pct}%</span>
                    </div>
                    <button onClick={() => removeEntry(idx)} style={{ fontSize: 16, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
                  </div>
                );
              })}
            </div>

            {/* Add another level */}
            {availLevels.length > 0 && rem > 0 && (
              <select
                value=""
                onChange={e => { if (e.target.value) addEntry(e.target.value); }}
                className="form-input"
                style={{ width: '100%', fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}
              >
                <option value="">+ add another level overlap…</option>
                {availLevels.map(sl => (
                  <option key={sl.id} value={sl.id}>#{sl.rank} {sl.name}</option>
                ))}
              </select>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-ghost" onClick={() => { setMapModal(null); setEntries([]); }}>Cancel</button>
              <button
                onClick={saveOverlapMappings}
                disabled={saving || rem !== 0 || entries.length === 0}
                style={{ padding: '9px 22px', fontSize: 13, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: (saving || rem !== 0) ? 'not-allowed' : 'pointer', opacity: (saving || rem !== 0 || entries.length === 0) ? 0.5 : 1 }}
              >
                {saving ? 'Saving…' : 'Save Mapping'}
              </button>
            </div>
          </Modal>
        );
      })()}
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
    <div className="admin-page-content">
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

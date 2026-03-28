import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAppData } from '../../context/AppDataContext';

/* ─── Shared helpers ─────────────────────────────────────────────────────── */
function Modal({ title, onClose, children, width = 460 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, padding: 36, width, maxWidth: '94vw' }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 20 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ padding: '10px 14px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 8, color: 'var(--rose)', fontSize: 13, marginBottom: 16 }}>
      {msg}
    </div>
  );
}

function SaveBtn({ saving, label = 'Save', disabled }) {
  return (
    <button disabled={saving || disabled} style={{ padding: '9px 22px', fontSize: 13, fontWeight: 600, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: (saving || disabled) ? 'not-allowed' : 'pointer', opacity: (saving || disabled) ? 0.6 : 1 }}>
      {saving ? 'Saving…' : label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminJobFunctions() {
  const { reloadFunctions } = useAppData();

  const [functions,   setFunctions]   = useState([]);
  const [stdLevels,   setStdLevels]   = useState([]); // standardized_levels from DB
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(null);

  // Function modal
  const [fnModal,  setFnModal]  = useState(null);
  const [fnForm,   setFnForm]   = useState({ displayName: '', sortOrder: '' });
  const [fnSaving, setFnSaving] = useState(false);
  const [fnError,  setFnError]  = useState('');

  // Level modal
  const [lvModal,  setLvModal]  = useState(null);
  const [lvForm,   setLvForm]   = useState({ name: '', sortOrder: '', standardizedLevelId: null });
  const [lvSaving, setLvSaving] = useState(false);
  const [lvError,  setLvError]  = useState('');

  const [expandedId, setExpandedId] = useState(null);

  // ── Load functions + standardized levels in parallel ──
  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/job-functions'),
      api.get('/public/standardized-levels'),
    ])
      .then(([fnRes, slRes]) => {
        setFunctions(fnRes.data?.data ?? []);
        // Already sorted by hierarchy_rank from the API
        setStdLevels(slRes.data?.data ?? []);
        setLoadError(null);
      })
      .catch(err => setLoadError(`${err.response?.status ?? 'Network error'}: ${err.response?.data?.message ?? err.message}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Helpers ──
  function stdLevelName(id) {
    if (!id) return null;
    return stdLevels.find(sl => sl.id === id)?.name ?? null;
  }

  /* ── Function CRUD ── */
  function openCreateFn() {
    setFnForm({ displayName: '', sortOrder: functions.length + 1 });
    setFnModal('create'); setFnError('');
  }
  function openEditFn(fn) {
    setFnForm({ displayName: fn.displayName, sortOrder: fn.sortOrder });
    setFnModal(fn); setFnError('');
  }

  async function saveFn(e) {
    e.preventDefault();
    setFnSaving(true); setFnError('');
    try {
      const payload = {
        name: fnModal === 'create'
          ? fnForm.displayName.trim().toUpperCase().replace(/\s+/g, '_')
          : fnModal.name,
        displayName: fnForm.displayName.trim(),
        sortOrder: Number(fnForm.sortOrder),
      };
      if (fnModal === 'create') await api.post('/admin/job-functions', payload);
      else                      await api.put(`/admin/job-functions/${fnModal.id}`, payload);
      setFnModal(null);
      load(); reloadFunctions();
    } catch (e) { setFnError(e.response?.data?.message ?? 'Save failed'); }
    finally { setFnSaving(false); }
  }

  async function deleteFn(fn) {
    if (!window.confirm(`Delete "${fn.displayName}" and all its levels? This cannot be undone.`)) return;
    try { await api.delete(`/admin/job-functions/${fn.id}`); load(); reloadFunctions(); }
    catch (e) { alert(e.response?.data?.message ?? 'Delete failed'); }
  }

  /* ── Level CRUD ── */
  function openAddLevel(fn) {
    setLvForm({ name: '', sortOrder: (fn.levels?.length ?? 0) + 1, standardizedLevelId: null, minYoe: '', maxYoe: '' });
    setLvModal({ fn }); setLvError('');
  }
  function openEditLevel(fn, level) {
    setLvForm({
      name: level.name,
      sortOrder: level.sortOrder,
      standardizedLevelId: level.standardizedLevelId ?? null,
      minYoe: level.minYoe ?? '',
      maxYoe: level.maxYoe ?? '',
    });
    setLvModal({ fn, level }); setLvError('');
  }

  async function saveLevel(e) {
    e.preventDefault();
    setLvSaving(true); setLvError('');
    try {
      const payload = {
        jobFunctionId: lvModal.fn.id,
        name: lvForm.name.trim(),
        sortOrder: Number(lvForm.sortOrder),
        standardizedLevelId: lvForm.standardizedLevelId || null,
        minYoe: lvForm.minYoe !== '' ? Number(lvForm.minYoe) : null,
        maxYoe: lvForm.maxYoe !== '' ? Number(lvForm.maxYoe) : null,
      };
      if (lvModal.level) await api.put(`/admin/job-functions/levels/${lvModal.level.id}`, payload);
      else               await api.post('/admin/job-functions/levels', payload);
      setLvModal(null);
      load(); reloadFunctions();
    } catch (e) { setLvError(e.response?.data?.message ?? 'Save failed'); }
    finally { setLvSaving(false); }
  }

  async function deleteLevel(level) {
    if (!window.confirm(`Delete level "${level.name}"?`)) return;
    try { await api.delete(`/admin/job-functions/levels/${level.id}`); load(); reloadFunctions(); }
    catch (e) { alert(e.response?.data?.message ?? 'Delete failed'); }
  }

  /* ── Render ── */
  return (
    <div className="admin-page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <div>
          <span className="section-tag">Admin</span>
          <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 26, color: 'var(--text-1)', marginTop: 4, letterSpacing: '-0.02em' }}>Job Functions</h2>
        </div>
        <button onClick={openCreateFn} style={{ padding: '9px 20px', borderRadius: 9, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          + Add Function
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 28 }}>
        Manage job functions (Engineering, Product, Program…) and the level ladder within each.
        These power the Function + Level dropdowns on the salary submission form.
      </p>

      {loadError && (
        <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 12, color: 'var(--rose)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠</span>
          <span>{loadError}</span>
          <button onClick={load} style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'rgba(224,92,122,0.15)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.3)', borderRadius: 6, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13 }}>Loading…</div>
      ) : !loadError && functions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <div>No job functions yet. The migration should have seeded Engineering, Product and Program — check that V12 ran successfully.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {functions.map(fn => (
            <div key={fn.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>

              {/* Function header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === fn.id ? null : fn.id)}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{fn.displayName}</span>
                  <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace" }}>
                    {fn.levels?.length ?? 0} level{(fn.levels?.length ?? 0) !== 1 ? 's' : ''} · sort #{fn.sortOrder}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEditFn(fn)} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => deleteFn(fn)} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
                </div>
                <span style={{ color: 'var(--text-3)', fontSize: 12, marginLeft: 4 }}>{expandedId === fn.id ? '▲' : '▼'}</span>
              </div>

              {/* Levels accordion */}
              {expandedId === fn.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'IBM Plex Mono',monospace" }}>
                      Levels
                    </span>
                    <button onClick={() => openAddLevel(fn)} style={{ padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 6, cursor: 'pointer' }}>
                      + Add Level
                    </button>
                  </div>

                  {!fn.levels?.length ? (
                    <div style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>No levels yet — add the first one.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[...fn.levels].sort((a, b) => a.sortOrder - b.sortOrder).map(lv => (
                        <div key={lv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: '#3b82f6', fontWeight: 700, minWidth: 28 }}>#{lv.sortOrder}</span>
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{lv.name}</span>
                          {lv.minYoe != null && lv.maxYoe != null && (
                            <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--text-3)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                              {lv.minYoe}–{lv.maxYoe}y
                            </span>
                          )}
                          {lv.standardizedLevelName && (
                            <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", color: '#3b82f6', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                              {lv.standardizedLevelName}
                            </span>
                          )}
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openEditLevel(fn, lv)} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 5, cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => deleteLevel(lv)} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.15)', borderRadius: 5, cursor: 'pointer' }}>Del</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Function modal */}
      {fnModal && (
        <Modal title={fnModal === 'create' ? 'Add Job Function' : `Edit — ${fnModal.displayName}`} onClose={() => setFnModal(null)}>
          <ErrorBanner msg={fnError} />
          <form onSubmit={saveFn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Display Name *</label>
              <input className="form-input" value={fnForm.displayName} onChange={e => setFnForm(f => ({ ...f, displayName: e.target.value }))} placeholder="e.g. Engineering" autoFocus required />
              {fnModal === 'create' && fnForm.displayName && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: "'IBM Plex Mono',monospace" }}>
                  Internal name: {fnForm.displayName.trim().toUpperCase().replace(/\s+/g, '_')}
                </div>
              )}
            </div>
            <div>
              <label className="form-label">Sort Order * <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>(lower = shown first)</span></label>
              <input className="form-input" type="number" min={0} value={fnForm.sortOrder} onChange={e => setFnForm(f => ({ ...f, sortOrder: e.target.value }))} required />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button type="button" className="btn-ghost" onClick={() => setFnModal(null)}>Cancel</button>
              <SaveBtn saving={fnSaving} disabled={!fnForm.displayName.trim()} />
            </div>
          </form>
        </Modal>
      )}

      {/* Level modal */}
      {lvModal && (
        <Modal title={lvModal.level ? `Edit Level — ${lvModal.level.name}` : `Add Level to ${lvModal.fn.displayName}`} onClose={() => setLvModal(null)}>
          <ErrorBanner msg={lvError} />
          <form onSubmit={saveLevel} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Level Name *</label>
              <input className="form-input" value={lvForm.name} onChange={e => setLvForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Senior Product Manager" autoFocus required />
            </div>
            <div>
              <label className="form-label">Sort Order * <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>(lower = more junior)</span></label>
              <input className="form-input" type="number" min={0} value={lvForm.sortOrder} onChange={e => setLvForm(f => ({ ...f, sortOrder: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">
                Maps to Standardized Level
                <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11, marginLeft: 6 }}>(optional)</span>
              </label>
              <select
                className="form-input"
                value={lvForm.standardizedLevelId ?? ''}
                onChange={e => setLvForm(f => ({ ...f, standardizedLevelId: e.target.value || null }))}
                style={{ cursor: 'pointer' }}
              >
                <option value="">— No mapping —</option>
                {stdLevels.map(sl => (
                  <option key={sl.id} value={sl.id}>{sl.name}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: "'IBM Plex Mono',monospace" }}>
                Used to group salaries in analytics charts. Levels are managed under Admin → Levels.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">
                  Min YOE
                  <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11, marginLeft: 6 }}>(inclusive)</span>
                </label>
                <input
                  className="form-input"
                  type="number" min={0} max={50}
                  placeholder="e.g. 3"
                  value={lvForm.minYoe}
                  onChange={e => setLvForm(f => ({ ...f, minYoe: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">
                  Max YOE
                  <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 11, marginLeft: 6 }}>(exclusive)</span>
                </label>
                <input
                  className="form-input"
                  type="number" min={0} max={50}
                  placeholder="e.g. 6"
                  value={lvForm.maxYoe}
                  onChange={e => setLvForm(f => ({ ...f, maxYoe: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: -8, fontFamily: "'IBM Plex Mono',monospace" }}>
              YOE band used for AI enrichment level mapping. e.g. Min 3, Max 6 → matches 3 ≤ yoe &lt; 6.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button type="button" className="btn-ghost" onClick={() => setLvModal(null)}>Cancel</button>
              <SaveBtn saving={lvSaving} disabled={!lvForm.name.trim()} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

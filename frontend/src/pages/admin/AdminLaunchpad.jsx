import { useState, useEffect, useCallback } from 'react';
import { useLaunchpad } from '../../context/LaunchpadContext';
import api from '../../services/api';
import TopProgressBar from '../../components/shared/TopProgressBar';
import CompanyLogo from '../../components/shared/CompanyLogo';

const RESOURCE_TYPES = ['CODING','SYSTEM_DESIGN','ARTICLE'];
const DIFFICULTIES   = ['EASY','MEDIUM','HARD'];
const ROUND_LABELS   = { DSA:'DSA', SYSTEM_DESIGN:'System Design', HR:'HR', MANAGERIAL:'Managerial', FULL_LOOP:'Full Loop' };
const STATUS_COLORS  = {
  PENDING:  { bg:'rgba(234,179,8,.12)',  color:'#ca8a04', border:'rgba(234,179,8,.25)' },
  ACCEPTED: { bg:'rgba(34,197,94,.12)',  color:'#16a34a', border:'rgba(34,197,94,.25)' },
  REJECTED: { bg:'rgba(239,68,68,.12)',  color:'#dc2626', border:'rgba(239,68,68,.25)' },
  PAUSED:   { bg:'rgba(100,116,139,.1)', color:'#64748b', border:'rgba(100,116,139,.2)' },
};

function StatusBadge({ status, active }) {
  const key = status === 'ACCEPTED' && active === false ? 'PAUSED' : status;
  const m = STATUS_COLORS[key] ?? STATUS_COLORS.PENDING;
  return <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:m.bg, color:m.color, border:`1px solid ${m.border}`, fontFamily:"'JetBrains Mono',monospace" }}>{key}</span>;
}

const EMPTY_RES = { type:'CODING', title:'', difficulty:'', topic:'', companies:'', link:'', description:'', sortOrder:0 };

/* ── Resources tab ────────────────────────────────────────────────────────── */
function ResourcesTab() {
  const { reload: reloadContext } = useLaunchpad();
  const [resources,  setResources]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [modal,      setModal]      = useState(null); // null | 'create' | resource obj
  const [form,       setForm]       = useState(EMPTY_RES);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true); setLoadError(null);
    api.get('/admin/launchpad/resources')
      .then(r => setResources(r.data?.data ?? []))
      .catch(err => setLoadError(`${err.response?.status ?? 'Error'}: ${err.response?.data?.message ?? err.message}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(EMPTY_RES); setModal('create'); setFormError(''); }
  function openEdit(r)  {
    setForm({ type:r.type, title:r.title, difficulty:r.difficulty||'', topic:r.topic||'', companies:(r.companies||[]).join(', '), link:r.link||'', description:r.description||'', sortOrder:r.sortOrder||0 });
    setModal(r); setFormError('');
  }

  async function save() {
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    setSaving(true); setFormError(''); TopProgressBar.start();
    const payload = { ...form, companies: form.companies.split(',').map(s=>s.trim()).filter(Boolean), sortOrder: Number(form.sortOrder)||0, difficulty: form.difficulty||null };
    try {
      if (modal === 'create') await api.post('/admin/launchpad/resources', payload);
      else                    await api.put(`/admin/launchpad/resources/${modal.id}`, payload);
      setModal(null); load(); reloadContext();
    } catch (err) { setFormError(err.response?.data?.message ?? 'Save failed'); }
    finally { setSaving(false); TopProgressBar.done(); }
  }

  async function toggleActive(r) {
    TopProgressBar.start();
    await api.patch(`/admin/launchpad/resources/${r.id}/toggle-active`);
    TopProgressBar.done(); load(); reloadContext();
  }

  async function del(r) {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    TopProgressBar.start();
    await api.delete(`/admin/launchpad/resources/${r.id}`);
    TopProgressBar.done(); load(); reloadContext();
  }

  const filtered = typeFilter ? resources.filter(r => r.type === typeFilter) : resources;

  return (
    <div>
      {/* Header + filters */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', gap:6 }}>
          {['','CODING','SYSTEM_DESIGN','ARTICLE'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{ padding:'5px 14px', borderRadius:99, fontSize:12, fontWeight:500, cursor:'pointer', border:`1px solid ${typeFilter===t?'#3b82f6':'var(--border)'}`, background:typeFilter===t?'rgba(59,130,246,0.1)':'transparent', color:typeFilter===t?'#3b82f6':'var(--text-2)' }}>
              {t||'All'}
            </button>
          ))}
        </div>
        <button onClick={openCreate}
          style={{ padding:'8px 18px', borderRadius:9, background:'#3b82f6', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          + Add resource
        </button>
      </div>

      {loadError && <div style={{ padding:'12px 16px', background:'var(--rose-dim)', color:'var(--rose)', borderRadius:10, fontSize:13, marginBottom:16 }}>{loadError}</div>}
      {loading   && <div style={{ color:'var(--text-3)', fontSize:13 }}>Loading…</div>}

      {!loading && !loadError && (
        <div className="salary-table-wrap">
          <table className="salary-table">
            <thead>
              <tr><th>Title</th><th>Type</th><th>Difficulty</th><th>Companies</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontStyle:'italic' }}>No resources yet.</td></tr>}
              {filtered.map(r => (
                <tr key={r.id} style={{ opacity:r.active?1:.55 }}>
                  <td>
                    <div style={{ fontWeight:600, color:'var(--text-1)', fontSize:13 }}>{r.title}</div>
                    {r.topic && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{r.topic}</div>}
                  </td>
                  <td><span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:'var(--text-2)' }}>{r.type}</span></td>
                  <td>{r.difficulty ? <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'var(--bg-2)', color:'var(--text-2)', border:'1px solid var(--border)' }}>{r.difficulty}</span> : '—'}</td>
                  <td style={{ fontSize:12, color:'var(--text-3)' }}>{(r.companies||[]).join(', ')||'—'}</td>
                  <td><span style={{ fontSize:11, fontWeight:600, color:r.active?'#16a34a':'#64748b' }}>{r.active?'Active':'Paused'}</span></td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => openEdit(r)} className="view-btn">Edit</button>
                      <button onClick={() => toggleActive(r)} style={{ padding:'4px 10px', fontSize:11, fontWeight:600, background:r.active?'rgba(100,116,139,.1)':'rgba(34,197,94,.1)', color:r.active?'#64748b':'#16a34a', border:`1px solid ${r.active?'rgba(100,116,139,.2)':'rgba(34,197,94,.25)'}`, borderRadius:6, cursor:'pointer' }}>
                        {r.active ? '⏸ Pause' : '▶ Activate'}
                      </button>
                      <button onClick={() => del(r)} style={{ padding:'4px 10px', fontSize:11, fontWeight:600, background:'var(--rose-dim)', color:'var(--rose)', border:'1px solid rgba(224,92,122,.2)', borderRadius:6, cursor:'pointer' }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(6px)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:20, padding:36, width:520, maxWidth:'92vw', maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--text-1)', marginBottom:20 }}>
              {modal === 'create' ? 'Add resource' : `Edit — ${modal.title}`}
            </h3>
            {formError && <div style={{ padding:'10px 14px', background:'var(--rose-dim)', color:'var(--rose)', borderRadius:8, fontSize:13, marginBottom:16 }}>{formError}</div>}

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  {RESOURCE_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type:t }))}
                      style={{ flex:1, padding:'7px 0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', background:form.type===t?'#3b82f6':'var(--bg-2)', color:form.type===t?'#fff':'var(--text-2)', border:form.type===t?'1px solid #3b82f6':'1px solid var(--border)' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Design a URL Shortener" /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select className="form-input" value={form.difficulty} onChange={e=>setForm(f=>({...f,difficulty:e.target.value}))}>
                    <option value="">None</option>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Sort order</label><input className="form-input" type="number" value={form.sortOrder} onChange={e=>setForm(f=>({...f,sortOrder:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Topic</label><input className="form-input" value={form.topic} onChange={e=>setForm(f=>({...f,topic:e.target.value}))} placeholder="e.g. Dynamic Programming, Databases" /></div>
              <div className="form-group"><label className="form-label">Companies <span style={{ fontWeight:400, color:'var(--text-3)', fontSize:11 }}>(comma-separated)</span></label><input className="form-input" value={form.companies} onChange={e=>setForm(f=>({...f,companies:e.target.value}))} placeholder="Google, Amazon, Flipkart" /></div>
              <div className="form-group"><label className="form-label">Link</label><input className="form-input" value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="https://leetcode.com/problems/..." /></div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Brief description of what this covers…" style={{ resize:'vertical' }} /></div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:24 }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ padding:'9px 22px', fontSize:13, fontWeight:600, background:'#3b82f6', color:'#fff', border:'none', borderRadius:8, cursor:saving?'not-allowed':'pointer', opacity:saving?.6:1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Experiences tab ──────────────────────────────────────────────────────── */
function ExperiencesTab() {
  const [experiences, setExperiences] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [statusFilter,setStatusFilter]= useState('');
  const [pausedOnly,  setPausedOnly]  = useState(false);
  const [actioning,   setActioning]   = useState(null);
  const [rejectTarget,setRejectTarget]= useState(null);
  const [adminNote,   setAdminNote]   = useState('');
  const [expanded,    setExpanded]    = useState(null);

  const load = useCallback(() => {
    setLoading(true); setLoadError(null);
    const params = {};
    if (pausedOnly)        params.paused = true;
    else if (statusFilter) params.status = statusFilter;
    api.get('/admin/launchpad/experiences', { params })
      .then(r => setExperiences(r.data?.data?.content ?? []))
      .catch(err => setLoadError(`${err.response?.status ?? 'Error'}: ${err.response?.data?.message ?? err.message}`))
      .finally(() => setLoading(false));
  }, [statusFilter, pausedOnly]);

  useEffect(() => { load(); }, [load]);

  function setFilter(f) {
    if (f === 'PAUSED') { setPausedOnly(true); setStatusFilter(''); }
    else                { setPausedOnly(false); setStatusFilter(f); }
  }
  const activeFilter = pausedOnly ? 'PAUSED' : statusFilter;

  async function accept(id) {
    setActioning(id); TopProgressBar.start();
    try { await api.patch(`/admin/launchpad/experiences/${id}/review`, { status:'ACCEPTED' }); load(); }
    catch(e) { console.error(e); }
    finally { setActioning(null); TopProgressBar.done(); }
  }

  async function confirmReject() {
    setActioning(rejectTarget.id); TopProgressBar.start();
    try {
      await api.patch(`/admin/launchpad/experiences/${rejectTarget.id}/review`, { status:'REJECTED', adminNote: adminNote||null });
      setRejectTarget(null); setAdminNote(''); load();
    } catch(e) { console.error(e); }
    finally { setActioning(null); TopProgressBar.done(); }
  }

  async function toggleActive(exp) {
    setActioning(exp.id); TopProgressBar.start();
    try { await api.patch(`/admin/launchpad/experiences/${exp.id}/toggle-active`); load(); }
    catch(e) { console.error(e); }
    finally { setActioning(null); TopProgressBar.done(); }
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {['','PENDING','ACCEPTED','REJECTED','PAUSED'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'5px 14px', borderRadius:99, fontSize:12, fontWeight:500, cursor:'pointer', border:`1px solid ${activeFilter===f?'#0ea5e9':'var(--border)'}`, background:activeFilter===f?'rgba(14,165,233,.1)':'transparent', color:activeFilter===f?'#0ea5e9':'var(--text-2)' }}>
            {f||'All'}
          </button>
        ))}
      </div>

      {loadError && <div style={{ padding:'12px 16px', background:'var(--rose-dim)', color:'var(--rose)', borderRadius:10, fontSize:13, marginBottom:16 }}>{loadError}</div>}
      {loading   && <div style={{ color:'var(--text-3)', fontSize:13 }}>Loading…</div>}

      {!loading && !loadError && experiences.length === 0 && (
        <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text-3)' }}>No experiences found.</div>
      )}

      {!loading && !loadError && experiences.map(exp => {
        const isPaused = exp.status === 'ACCEPTED' && exp.active === false;
        return (
          <div key={exp.id} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:14, marginBottom:12, overflow:'hidden', opacity:isPaused?.6:1 }}>
            <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
              onClick={() => setExpanded(expanded===exp.id?null:exp.id)}>
              {exp.companyId && <CompanyLogo companyId={exp.companyId} companyName={exp.companyName} size={32} radius={8} />}
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14, color:'var(--text-1)' }}>{exp.companyName||'—'} <span style={{ fontWeight:400, color:'var(--text-3)', fontSize:12 }}>{exp.year}</span></div>
                <div style={{ display:'flex', gap:6, marginTop:4, alignItems:'center', flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:'var(--text-3)' }}>{ROUND_LABELS[exp.roundType]||exp.roundType}</span>
                  <StatusBadge status={exp.status} active={exp.active} />
                  <span style={{ fontSize:11, color:'var(--text-3)', marginLeft:'auto' }}>by {exp.submittedByName||'—'}</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                {exp.status === 'PENDING' && (
                  <>
                    <button onClick={() => accept(exp.id)} disabled={actioning===exp.id}
                      style={{ padding:'5px 12px', fontSize:12, fontWeight:600, background:'rgba(34,197,94,.1)', color:'#16a34a', border:'1px solid rgba(34,197,94,.25)', borderRadius:7, cursor:'pointer' }}>✓</button>
                    <button onClick={() => { setRejectTarget(exp); setAdminNote(''); }} disabled={actioning===exp.id}
                      style={{ padding:'5px 12px', fontSize:12, fontWeight:600, background:'var(--rose-dim)', color:'var(--rose)', border:'1px solid rgba(224,92,122,.2)', borderRadius:7, cursor:'pointer' }}>✕</button>
                  </>
                )}
                {exp.status === 'ACCEPTED' && (
                  <button onClick={() => toggleActive(exp)} disabled={actioning===exp.id}
                    style={{ padding:'5px 12px', fontSize:12, fontWeight:600, background:isPaused?'rgba(34,197,94,.1)':'rgba(100,116,139,.1)', color:isPaused?'#16a34a':'#64748b', border:`1px solid ${isPaused?'rgba(34,197,94,.25)':'rgba(100,116,139,.2)'}`, borderRadius:7, cursor:'pointer' }}>
                    {actioning===exp.id?'…':isPaused?'▶ Reactivate':'⏸ Pause'}
                  </button>
                )}
              </div>
              <span style={{ color:'var(--text-3)', fontSize:12 }}>{expanded===exp.id?'▲':'▼'}</span>
            </div>
            {expanded === exp.id && (
              <div style={{ padding:'0 18px 18px', borderTop:'1px solid var(--border)' }}>
                <div style={{ paddingTop:14, fontSize:13, color:'var(--text-2)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{exp.experience}</div>
                {exp.questions?.length > 0 && (
                  <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
                    {exp.questions.map((q,i) => (
                      <div key={i} style={{ display:'flex', gap:10, padding:'7px 12px', background:'var(--bg-2)', borderRadius:8, border:'1px solid var(--border)' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>Q{i+1}</span>
                        <span style={{ fontSize:12, color:'var(--text-1)' }}>{q}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {rejectTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
          onClick={e => e.target===e.currentTarget&&setRejectTarget(null)}>
          <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:16, padding:32, width:'100%', maxWidth:440, margin:'0 16px' }}>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:'var(--text-1)', marginBottom:16 }}>Reject experience</h3>
            <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:16 }}>{rejectTarget.companyName} — {rejectTarget.submittedByName}</p>
            <label className="form-label" style={{ display:'block', marginBottom:6 }}>Reason (optional)</label>
            <textarea className="form-input" rows={3} value={adminNote} onChange={e=>setAdminNote(e.target.value)} placeholder="e.g. Duplicate, incomplete write-up…" style={{ resize:'vertical', width:'100%', marginBottom:20 }} />
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn-ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button onClick={confirmReject} disabled={!!actioning}
                style={{ padding:'9px 20px', fontSize:13, fontWeight:600, background:'var(--rose-dim)', color:'var(--rose)', border:'1px solid rgba(224,92,122,.3)', borderRadius:8, cursor:'pointer' }}>
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main admin page ──────────────────────────────────────────────────────── */
export default function AdminLaunchpad() {
  const [tab, setTab] = useState('resources');

  return (
    <div style={{ padding:40 }}>
      <div style={{ marginBottom:28 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:'var(--gold)', letterSpacing:'.1em', textTransform:'uppercase' }}>Admin</span>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, color:'var(--text-1)', marginTop:8, letterSpacing:'-.02em' }}>Launchpad</h2>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:28, borderBottom:'1px solid var(--border)' }}>
        {[{ key:'resources', label:'Prep Resources' }, { key:'experiences', label:'Interview Experiences' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', background:'transparent', border:'none', borderBottom:tab===t.key?'2px solid #3b82f6':'2px solid transparent', color:tab===t.key?'#3b82f6':'var(--text-2)', marginBottom:-1, transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resources'    && <ResourcesTab />}
      {tab === 'experiences'  && <ExperiencesTab />}
    </div>
  );
}

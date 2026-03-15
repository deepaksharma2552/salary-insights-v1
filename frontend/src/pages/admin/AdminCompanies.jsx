import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const EMPTY = { name: '', industry: '', website: '', description: '' };

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | 'create' | {id,..}
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/companies')
      .then(r => setCompanies(r.data?.content ?? r.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(EMPTY); setModal('create'); setError(''); }
  function openEdit(c)  { setForm({ name: c.name, industry: c.industry ?? '', website: c.website ?? '', description: c.description ?? '' }); setModal(c); setError(''); }

  async function save() {
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        await api.post('/admin/companies', form);
      } else {
        await api.put(`/admin/companies/${modal.id}`, form);
      }
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(c) {
    await api.patch(`/admin/companies/${c.id}/toggle-status`);
    load();
  }

  async function del(id) {
    if (!window.confirm('Delete this company?')) return;
    await api.delete(`/admin/companies/${id}`);
    load();
  }

  return (
    <div style={{ padding: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
        <div>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>Companies</h2>
        </div>
        <button className="btn-primary" style={{ padding: '10px 22px' }} onClick={openCreate}>+ Add Company</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading…</div>
      ) : (
        <div className="salary-table-wrap">
          <table className="salary-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id}>
                  <td><div className="company-name">{c.name}</div></td>
                  <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{c.industry ?? '—'}</td>
                  <td>
                    <span className={`status-badge ${c.status === 'ACTIVE' ? 'status-approved' : 'status-rejected'}`}>
                      {c.status === 'ACTIVE' ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="view-btn" onClick={() => openEdit(c)}>Edit</button>
                      <button
                        onClick={() => toggleStatus(c)}
                        style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'var(--ink-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                      >
                        {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => del(c.id)}
                        style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 7, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setModal(null)}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, padding: 36, width: 480, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: 'var(--text-1)', marginBottom: 24 }}>
              {modal === 'create' ? 'Add Company' : `Edit — ${modal.name}`}
            </h3>
            {error && <div style={{ padding: '10px 14px', background: 'var(--rose-dim)', color: 'var(--rose)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

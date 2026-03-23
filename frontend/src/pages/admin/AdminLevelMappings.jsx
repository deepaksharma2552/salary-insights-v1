import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function AdminLevelMappings() {
  const [stdLevels,    setStdLevels]    = useState([]);
  const [companies,    setCompanies]    = useState([]);
  const [mappings,     setMappings]     = useState([]);
  const [selectedCo,   setSelectedCo]  = useState('');
  const [coLevels,     setCoLevels]    = useState([]);
  const [loading,      setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/levels/standardized'),
      api.get('/admin/companies'),
    ]).then(([std, cos]) => {
      setStdLevels(std.data?.data ?? []);
      setCompanies(cos.data?.data?.content ?? []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCo) return;
    api.get(`/admin/levels/company/${selectedCo}`)
      .then(r => setCoLevels(r.data?.data ?? []))
      .catch(console.error);
  }, [selectedCo]);

  async function addMapping(companyLevelId, standardizedLevelId) {
    await api.post('/admin/levels/mappings', { companyLevelId, standardizedLevelId });
    // reload
    if (selectedCo) {
      api.get(`/admin/levels/company/${selectedCo}`).then(r => setCoLevels(r.data?.data ?? []));
    }
  }

  async function removeMapping(companyLevelId) {
    await api.delete(`/admin/levels/mappings/company-level/${companyLevelId}`);
    if (selectedCo) {
      api.get(`/admin/levels/company/${selectedCo}`).then(r => setCoLevels(r.data?.data ?? []));
    }
  }

  return (
    <div className="admin-page-content">
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>Level Mappings</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 6 }}>Map company-internal levels to standardized cross-company levels.</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading…</div>
      ) : (
        <div className="grid-contact" style={{ gap: 24 }}>

          {/* Standardized Levels */}
          <div className="chart-card">
            <div className="chart-title" style={{ marginBottom: 16 }}>Standardized Levels</div>
            {stdLevels.map(l => (
              <div key={l.id} style={{ padding: '10px 14px', background: 'var(--ink-3)', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-1)', fontSize: 14, fontWeight: 500 }}>{l.name}</span>
                <span style={{ color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>rank {l.rank}</span>
              </div>
            ))}
          </div>

          {/* Company Level Mappings */}
          <div className="chart-card">
            <div className="chart-title" style={{ marginBottom: 16 }}>Company Mappings</div>
            <select
              className="select-field"
              style={{ width: '100%', marginBottom: 20 }}
              value={selectedCo}
              onChange={e => setSelectedCo(e.target.value)}
            >
              <option value="">Select a company…</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {selectedCo && (
              coLevels.length === 0 ? (
                <div style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No internal levels found for this company.</div>
              ) : (
                <div className="salary-table-wrap">
                  <table className="salary-table">
                    <thead>
                      <tr>
                        <th>Internal Level</th>
                        <th>Mapped To</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coLevels.map(cl => (
                        <tr key={cl.id}>
                          <td><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: 'var(--text-1)' }}>{cl.name}</span></td>
                          <td>
                            {cl.mappedStandardizedLevel ? (
                              <span className="badge badge-level-mid">{cl.mappedStandardizedLevel}</span>
                            ) : (
                              <select
                                className="select-field"
                                style={{ fontSize: 12, padding: '5px 28px 5px 10px' }}
                                onChange={e => { if (e.target.value) addMapping(cl.id, e.target.value); }}
                                defaultValue=""
                              >
                                <option value="">Map to…</option>
                                {stdLevels.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            )}
                          </td>
                          <td>
                            {cl.mappedStandardizedLevel && (
                              <button
                                onClick={() => removeMapping(cl.id)}
                                style={{ padding: '4px 10px', fontSize: 11, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 6, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

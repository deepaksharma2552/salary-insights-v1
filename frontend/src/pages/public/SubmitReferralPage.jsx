import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

export default function SubmitReferralPage() {
  const navigate     = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  // Company autocomplete — identical pattern to SubmitSalaryPage
  const [companyQuery,    setCompanyQuery]    = useState('');
  const [companySelected, setCompanySelected] = useState(null); // { id, name, isNew }
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const searchTimeout   = useRef(null);
  const autocompleteRef = useRef(null);

  const [form, setForm] = useState({
    companyId:   '',
    companyName: '',
    referralLink: '',
    expiresAt:   new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0],
  });

  // ── Company autocomplete ────────────────────────────────────────────────────

  const searchCompanies = useCallback((query) => {
    if (query.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    setSearchLoading(true);
    api.get('/public/companies', { params: { name: query, size: 8, page: 0 } })
      .then(r => { setSuggestions(r.data?.data?.content ?? []); setShowSuggestions(true); })
      .catch(console.error)
      .finally(() => setSearchLoading(false));
  }, []);

  function handleCompanyInput(e) {
    const val = e.target.value;
    setCompanyQuery(val);
    setCompanySelected(null);
    setForm(f => ({ ...f, companyId: '', companyName: '' }));
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchCompanies(val), 300);
  }

  function selectCompany(c) {
    setCompanySelected(c);
    setCompanyQuery(c.name);
    setForm(f => ({ ...f, companyId: c.id, companyName: '' }));
    setShowSuggestions(false);
    setSuggestions([]);
  }

  function useNewCompany() {
    const name = companyQuery.trim();
    if (!name) return;
    setCompanySelected({ id: null, name, isNew: true });
    setForm(f => ({ ...f, companyId: '', companyName: name }));
    setShowSuggestions(false);
    setSuggestions([]);
  }

  useEffect(() => {
    function onClickOutside(e) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target))
        setShowSuggestions(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    if (!form.companyId && !form.companyName) {
      setError('Please select or enter a company name.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/referrals', {
        companyId:    form.companyId   || null,
        companyName:  form.companyName || null,
        referralLink: form.referralLink,
        // Send as ISO datetime if user picked a date, otherwise null → backend defaults to 30 days
        expiresAt:    form.expiresAt ? `${form.expiresAt}T23:59:59` : null,
      });
      navigate('/my-referral-links', { state: { submitted: true } });
    } catch (err) {
      setError(
        err.response?.data?.message ??
        err.response?.data?.error   ??
        'Submission failed. Please try again.'
      );
      setSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="section" style={{ background: 'var(--ink-2)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progressCrawl {
          0%  { width: 0%;  }
          40% { width: 65%; }
          70% { width: 82%; }
          100%{ width: 90%; }
        }
      `}</style>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="section-header" style={{ textAlign: 'center' }}>
          <span className="section-tag">Referrals</span>
          <h2 className="section-title">Add a <em>Referral</em></h2>
          <p style={{ color: 'var(--text-2)', marginTop: 12, fontSize: 15 }}>
            Share a referral link for an open role. It will appear under Referral Board once approved.
          </p>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, padding: 40 }}>

          {error && (
            <div style={{
              padding: '12px 16px', background: 'var(--rose-dim)',
              border: '1px solid rgba(224,92,122,0.2)', borderRadius: 10,
              color: 'var(--rose)', fontSize: 13, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Company autocomplete ── */}
              <div className="form-group" ref={autocompleteRef} style={{ position: 'relative' }}>
                <label className="form-label">Company Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Type 3+ characters to search, or enter any name…"
                    value={companyQuery}
                    onChange={handleCompanyInput}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    autoComplete="off"
                    disabled={submitting}
                    style={{ paddingRight: 36 }}
                  />
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    {searchLoading ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                    ) : companySelected ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : null}
                  </div>
                </div>

                {/* Hint below input */}
                {!companySelected && companyQuery.length > 0 && companyQuery.length < 3 && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                    Type {3 - companyQuery.length} more character{3 - companyQuery.length !== 1 ? 's' : ''} to search…
                  </div>
                )}
                {companySelected && (
                  <div style={{ fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono',monospace", color: companySelected.isNew ? 'var(--gold)' : 'var(--teal)' }}>
                    {companySelected.isNew ? '✦ New company — will be created on submit' : '✓ Company selected'}
                  </div>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'var(--panel)', border: '1px solid var(--border)',
                    borderRadius: 12, marginTop: 4, overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                  }}>
                    {suggestions.map((c, i) => (
                      <div
                        key={c.id}
                        onClick={() => selectCompany(c)}
                        style={{
                          padding: '9px 14px', cursor: 'pointer',
                          borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                          display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <CompanyLogo
                          companyId={c.id}
                          companyName={c.name}
                          logoUrl={c.logoUrl}
                          website={c.website}
                          size={28}
                          radius={6}
                        />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
                          {c.industry && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{c.industry}</div>}
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                      {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found
                    </div>
                  </div>
                )}

                {/* No results — offer to create */}
                {showSuggestions && !searchLoading && suggestions.length === 0 && companyQuery.length >= 3 && !companySelected && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'var(--panel)', border: '1px solid var(--border)',
                    borderRadius: 12, marginTop: 4, padding: 16,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
                      No match found for <strong>"{companyQuery}"</strong>
                    </div>
                    <button
                      type="button"
                      onClick={useNewCompany}
                      style={{
                        width: '100%', padding: '9px 16px', cursor: 'pointer',
                        background: 'var(--teal-dim)', color: 'var(--teal)',
                        border: '1px solid rgba(62,207,176,0.3)', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add "{companyQuery}" as new company
                    </button>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, textAlign: 'center', fontFamily: "'JetBrains Mono',monospace" }}>
                      It will be auto-created when you submit
                    </div>
                  </div>
                )}
              </div>

              {/* ── Referral link ── */}
              <div className="form-group">
                <label className="form-label">Referral Link *</label>
                <input
                  className="form-input"
                  name="referralLink"
                  type="url"
                  placeholder="https://company.com/jobs/referral?ref=..."
                  value={form.referralLink}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                  The direct referral or job application link you want to share
                </div>
              </div>

              {/* ── Expiry date ── */}
              <div className="form-group">
                <label className="form-label">
                  Expires On
                </label>
                <input
                  className="form-input"
                  name="expiresAt"
                  type="date"
                  min={new Date(Date.now() + 86_400_000).toISOString().split('T')[0]}
                  value={form.expiresAt}
                  onChange={handleChange}
                  disabled={submitting}
                />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                  Leave blank to default to 30 days from today
                </div>
              </div>

            </div>

            {/* Actions */}
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: '11px 24px', fontSize: 14 }}
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-auth"
                  disabled={submitting}
                  style={{
                    padding: '11px 28px', fontSize: 14, borderRadius: 10,
                    opacity: submitting ? 0.65 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  {submitting ? (
                    <>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        animation: 'spin 0.7s linear infinite', flexShrink: 0,
                      }} />
                      Submitting…
                    </>
                  ) : 'Submit for Review →'}
                </button>
              </div>

              {submitting && (
                <div style={{ width: '100%', height: 3, background: 'rgba(14,165,233,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
                    borderRadius: 99, animation: 'progressCrawl 3s cubic-bezier(0.05,0.6,0.4,1) forwards',
                  }} />
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function SubmitReferralPage() {
  const navigate    = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  // Company autocomplete — reuses same pattern as SubmitSalaryPage
  const [companyQuery,    setCompanyQuery]    = useState('');
  const [companySelected, setCompanySelected] = useState(null);
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const searchTimeout   = useRef(null);
  const autocompleteRef = useRef(null);

  const [form, setForm] = useState({
    candidateName:  '',
    candidateEmail: '',
    jobTitle:       '',
    companyId:      '',
    companyNameRaw: '',
    note:           '',
  });

  // ── Company search ──────────────────────────────────────────────────────────

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
    setForm(f => ({ ...f, companyId: '', companyNameRaw: '' }));
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchCompanies(val), 300);
  }

  function selectCompany(c) {
    setCompanySelected(c);
    setCompanyQuery(c.name);
    setForm(f => ({ ...f, companyId: c.id, companyNameRaw: '' }));
    setShowSuggestions(false);
    setSuggestions([]);
  }

  function useRawCompany() {
    const name = companyQuery.trim();
    if (!name) return;
    setCompanySelected({ id: null, name, isRaw: true });
    setForm(f => ({ ...f, companyId: '', companyNameRaw: name }));
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

    if (!form.companyId && !form.companyNameRaw) {
      setError('Please select or type a company name.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/referrals', {
        candidateName:  form.candidateName,
        candidateEmail: form.candidateEmail,
        jobTitle:       form.jobTitle       || null,
        companyId:      form.companyId      || null,
        companyNameRaw: form.companyNameRaw || null,
        note:           form.note           || null,
      });
      // Redirect to tracker so user immediately sees the new PENDING entry
      navigate('/my-referrals', { state: { submitted: true } });
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

      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="section-header" style={{ textAlign: 'center' }}>
          <span className="section-tag">Referrals</span>
          <h2 className="section-title">Refer a <em>Candidate</em></h2>
          <p style={{ color: 'var(--text-2)', marginTop: 12, fontSize: 15 }}>
            Know someone great? Submit their details and track the outcome from My Referrals.
          </p>
        </div>

        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 40,
        }}>

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
            <div className="form-grid">

              {/* Candidate name */}
              <div className="form-group">
                <label className="form-label">Candidate Name *</label>
                <input
                  className="form-input"
                  name="candidateName"
                  placeholder="e.g. Priya Sharma"
                  value={form.candidateName}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Candidate email */}
              <div className="form-group">
                <label className="form-label">Candidate Email *</label>
                <input
                  className="form-input"
                  name="candidateEmail"
                  type="email"
                  placeholder="priya@example.com"
                  value={form.candidateEmail}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
              </div>

              {/* Job title */}
              <div className="form-group">
                <label className="form-label">Role / Job Title</label>
                <input
                  className="form-input"
                  name="jobTitle"
                  placeholder="e.g. Senior Software Engineer"
                  value={form.jobTitle}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              {/* Company autocomplete */}
              <div className="form-group" ref={autocompleteRef} style={{ position: 'relative' }}>
                <label className="form-label">Company</label>
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

                {/* Selection confirmation */}
                {companySelected && (
                  <div style={{ fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono',monospace", color: companySelected.isRaw ? 'var(--gold)' : 'var(--teal)' }}>
                    {companySelected.isRaw ? '✦ Will be noted as free-text' : '✓ Company matched'}
                  </div>
                )}

                {/* Dropdown suggestions */}
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
                          padding: '10px 16px', cursor: 'pointer',
                          borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                          display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                          background: 'var(--ink-3)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: 'var(--gold)',
                        }}>
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
                          {c.industry && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.industry}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No results — offer free-text */}
                {showSuggestions && !searchLoading && suggestions.length === 0 && companyQuery.length >= 3 && !companySelected && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'var(--panel)', border: '1px solid var(--border)',
                    borderRadius: 12, marginTop: 4, padding: 16,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                      No match for <strong>"{companyQuery}"</strong>
                    </div>
                    <button
                      type="button"
                      onClick={useRawCompany}
                      style={{
                        width: '100%', padding: '8px 16px', cursor: 'pointer',
                        background: 'var(--teal-dim)', color: 'var(--teal)',
                        border: '1px solid rgba(62,207,176,0.3)', borderRadius: 8,
                        fontSize: 13, fontWeight: 600,
                      }}
                    >
                      Use "{companyQuery}" as-is
                    </button>
                  </div>
                )}
              </div>

              {/* Note */}
              <div className="form-group full">
                <label className="form-label">Note <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  className="form-input"
                  name="note"
                  rows={3}
                  placeholder="How do you know them? Any context about their background or the role…"
                  value={form.note}
                  onChange={handleChange}
                  disabled={submitting}
                  style={{ resize: 'vertical' }}
                />
              </div>

            </div>

            {/* Actions */}
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                  ) : 'Submit Referral →'}
                </button>
              </div>

              {/* Progress bar */}
              {submitting && (
                <div style={{ width: '100%', height: 3, background: 'rgba(14,165,233,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
                    borderRadius: 99,
                    animation: 'progressCrawl 3s cubic-bezier(0.05,0.6,0.4,1) forwards',
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

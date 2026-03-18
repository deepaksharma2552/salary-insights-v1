import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function SubmitSalaryPage() {
  const navigate  = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');

  // Company autocomplete state
  const [companyQuery,    setCompanyQuery]    = useState('');
  const [companySelected, setCompanySelected] = useState(null); // { id, name }
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const searchTimeout = useRef(null);
  const autocompleteRef = useRef(null);

  const [form, setForm] = useState({
    companyId: '',
    companyName: '',
    jobTitle: '',
    companyInternalLevel: '',
    location: '',
    baseSalary: '',
    bonus: '',
    equity: '',
    yearsOfExperience: '',
    derivedExperienceLevel: '',
    employmentType: 'FULL_TIME',
    notes: '',
  });

  // Search companies after 3 characters typed
  const searchCompanies = useCallback((query) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearchLoading(true);
    api.get('/public/companies', { params: { name: query, size: 8, page: 0 } })
      .then(r => {
        const results = r.data?.data?.content ?? [];
        setSuggestions(results);
        setShowSuggestions(true);
      })
      .catch(console.error)
      .finally(() => setSearchLoading(false));
  }, []);

  // Debounce the search
  function handleCompanyInput(e) {
    const val = e.target.value;
    setCompanyQuery(val);
    setCompanySelected(null);
    setForm(f => ({ ...f, companyId: '', companyName: '' }));
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchCompanies(val), 300);
  }

  function selectCompany(company) {
    setCompanySelected(company);
    setCompanyQuery(company.name);
    setForm(f => ({ ...f, companyId: company.id, companyName: company.name }));
    setShowSuggestions(false);
    setSuggestions([]);
  }

  // Called when user wants to proceed with a new (auto-create) company
  function useNewCompany() {
    const name = companyQuery.trim();
    if (!name) return;
    setCompanySelected({ id: null, name, isNew: true });
    setForm(f => ({ ...f, companyId: '', companyName: name }));
    setShowSuggestions(false);
    setSuggestions([]);
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Derive experience level from years of experience
  function deriveExperienceLevelFromYoe(yoe) {
    const y = Number(yoe);
    if (isNaN(y) || yoe === '') return '';
    if (y <= 1)  return 'INTERN';
    if (y <= 2)  return 'ENTRY';
    if (y <= 5)  return 'MID';
    if (y <= 8)  return 'SENIOR';
    if (y <= 12) return 'LEAD';
    if (y <= 16) return 'MANAGER';
    if (y <= 20) return 'DIRECTOR';
    return 'VP';
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => {
      const updated = { ...f, [name]: value };
      if (name === 'yearsOfExperience') {
        updated.derivedExperienceLevel = deriveExperienceLevelFromYoe(value);
      }
      return updated;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // Validate company — either selected from list or typed for auto-create
    if (!form.companyId && !form.companyName) {
      setError('Please enter or select a company name.');
      return;
    }
    if (!form.companyInternalLevel) {
      setError('Please select a job level.');
      return;
    }
    if (!form.location) {
      setError('Please select a location.');
      return;
    }
    // Derive experienceLevel from YOE if available, else fall back to companyInternalLevel mapping
    const LEVEL_DERIVE = {
      SDE_1: 'ENTRY', SDE_2: 'MID', SDE_3: 'SENIOR',
      STAFF_ENGINEER: 'LEAD', PRINCIPAL_ENGINEER: 'LEAD', ARCHITECT: 'LEAD',
      ENGINEERING_MANAGER: 'MANAGER', SR_ENGINEERING_MANAGER: 'MANAGER',
      DIRECTOR: 'DIRECTOR', SR_DIRECTOR: 'DIRECTOR', VP: 'VP',
    };
    const derivedExperienceLevel = form.derivedExperienceLevel
      || LEVEL_DERIVE[form.companyInternalLevel]
      || 'MID';
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/salaries/submit', {
        ...(form.companyId   ? { companyId: form.companyId }     : {}),
        ...(form.companyName ? { companyName: form.companyName } : {}),
        jobTitle:              form.jobTitle,
        companyInternalLevel:  form.companyInternalLevel || null,
        location:              form.location,
        experienceLevel:       derivedExperienceLevel,
        employmentType:        form.employmentType,
        baseSalary:            Number(form.baseSalary)        || 0,
        bonus:                 Number(form.bonus)             || null,
        equity:                Number(form.equity)            || null,
        yearsOfExperience:     form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
      });
      console.log('Salary submitted successfully:', res.data);
      setSuccess(true);
      setTimeout(() => navigate('/salaries'), 2000);
    } catch (err) {
      console.error('Submit error:', err.response?.status, err.response?.data);
      setError(err.response?.data?.error ?? err.response?.data?.message ?? `Submission failed (${err.response?.status ?? 'network error'}). Please try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="section" style={{ background: 'var(--ink-2)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>✓</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: 'var(--teal)', marginBottom: 12 }}>Submitted!</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 16 }}>Your salary entry is pending review. Redirecting to salaries…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section" style={{ background: 'var(--ink-2)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="section-header" style={{ textAlign: 'center' }}>
          <span className="section-tag">Contribute</span>
          <h2 className="section-title">Share Your <em>Salary</em></h2>
          <p style={{ color: 'var(--text-2)', marginTop: 16, fontSize: 16 }}>
            Your anonymous submission powers SalaryInsights360 — giving everyone a complete 360° view of what companies really pay.
          </p>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, padding: 48 }}>
          {error && (
            <div style={{ padding: '12px 16px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 10, color: 'var(--rose)', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">

              <div className="form-group" ref={autocompleteRef} style={{ position: 'relative' }}>
                <label className="form-label">Company *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Type at least 3 characters to search…"
                    value={companyQuery}
                    onChange={handleCompanyInput}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    autoComplete="off"
                    required={!companySelected}
                    style={{ paddingRight: 36 }}
                  />
                  {/* Status icon */}
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    {searchLoading ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                    ) : companySelected ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : companyQuery.length >= 3 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                    ) : null}
                  </div>
                </div>

                {/* Hint text */}
                {!companySelected && companyQuery.length > 0 && companyQuery.length < 3 && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                    Type {3 - companyQuery.length} more character{3 - companyQuery.length !== 1 ? 's' : ''} to search…
                  </div>
                )}
                {companySelected && (
                  <div style={{ fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono',monospace",
                    color: companySelected.isNew ? 'var(--gold)' : 'var(--teal)' }}>
                    {companySelected.isNew
                      ? '✦ New company — will be created on submit'
                      : '✓ Company selected'}
                  </div>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'var(--panel)', border: '1px solid var(--border)',
                    borderRadius: 12, marginTop: 4, overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                  }}>
                    {suggestions.map((c, i) => (
                      <div
                        key={c.id}
                        onClick={() => selectCompany(c)}
                        style={{
                          padding: '10px 16px', cursor: 'pointer',
                          borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                          display: 'flex', alignItems: 'center', gap: 12,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: 'var(--ink-3)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                          color: 'var(--gold)',
                        }}>
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
                          {c.industry && (
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{c.industry}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div style={{
                      padding: '8px 16px', fontSize: 11,
                      color: 'var(--text-3)', fontFamily: "'JetBrains Mono',monospace",
                      borderTop: '1px solid var(--border)', background: 'var(--ink-2)'
                    }}>
                      {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found
                    </div>
                  </div>
                )}

                {/* No results state */}
                {showSuggestions && !searchLoading && suggestions.length === 0 && companyQuery.length >= 3 && !companySelected && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'var(--panel)', border: '1px solid var(--border)',
                    borderRadius: 12, marginTop: 4, padding: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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
                        fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
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

                {/* Hidden input to enforce required validation */}
                <input type="hidden" name="companyId" value={form.companyId} required />
              </div>

              <div className="form-group">
                <label className="form-label">Job Title *</label>
                <input className="form-input" name="jobTitle" placeholder="e.g. Software Engineer II" value={form.jobTitle} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Job Level *</label>
                <select className="form-input" name="companyInternalLevel" required value={form.companyInternalLevel} onChange={handleChange} style={{ cursor: 'pointer' }}>
                  <option value="">Select internal level</option>
                  <option value="SDE_1">SDE 1</option>
                  <option value="SDE_2">SDE 2</option>
                  <option value="SDE_3">SDE 3</option>
                  <option value="STAFF_ENGINEER">Staff Engineer</option>
                  <option value="PRINCIPAL_ENGINEER">Principal Engineer</option>
                  <option value="ARCHITECT">Architect</option>
                  <option value="ENGINEERING_MANAGER">Engineering Manager</option>
                  <option value="SR_ENGINEERING_MANAGER">Sr. Engineering Manager</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="SR_DIRECTOR">Sr. Director</option>
                  <option value="VP">VP</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Location *</label>
                <select className="form-input" name="location" value={form.location} onChange={handleChange} required style={{ cursor: 'pointer' }}>
                  <option value="">Select location</option>
                  <option value="BENGALURU">Bengaluru</option>
                  <option value="HYDERABAD">Hyderabad</option>
                  <option value="PUNE">Pune</option>
                  <option value="DELHI_NCR">Delhi-NCR</option>
                  <option value="KOCHI">Kochi</option>
                  <option value="COIMBATORE">Coimbatore</option>
                  <option value="MYSORE">Mysore</option>
                  <option value="MANGALURU">Mangaluru</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Base Salary (₹/yr) *</label>
                <input className="form-input" name="baseSalary" type="number" min="0" placeholder="e.g. 3200000" value={form.baseSalary} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Bonus (₹/yr)</label>
                <input className="form-input" name="bonus" type="number" min="0" placeholder="e.g. 500000" value={form.bonus} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Equity / RSU (₹/yr)</label>
                <input className="form-input" name="equity" type="number" min="0" placeholder="e.g. 1500000" value={form.equity} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Years of Experience *</label>
                <input className="form-input" name="yearsOfExperience" type="number" min="0" max="50" placeholder="e.g. 4" value={form.yearsOfExperience} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Experience Level
                  {form.derivedExperienceLevel && (
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 7px', borderRadius: 100, background: 'rgba(14,165,233,0.12)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.25)' }}>
                      auto-filled
                    </span>
                  )}
                </label>
                <select
                  className="form-input"
                  name="derivedExperienceLevel"
                  value={form.derivedExperienceLevel}
                  onChange={handleChange}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Select level</option>
                  <option value="INTERN">Intern (0–1 yr)</option>
                  <option value="ENTRY">Entry (1–2 yrs)</option>
                  <option value="MID">Mid (2–5 yrs)</option>
                  <option value="SENIOR">Senior (5–8 yrs)</option>
                  <option value="LEAD">Lead (8–12 yrs)</option>
                  <option value="MANAGER">Manager (12–16 yrs)</option>
                  <option value="DIRECTOR">Director (16–20 yrs)</option>
                  <option value="VP">VP (20+ yrs)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Employment Type</label>
                <select className="form-input" name="employmentType" value={form.employmentType} onChange={handleChange} style={{ cursor: 'pointer' }}>
                  <option value="FULL_TIME">Full-time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="PART_TIME">Part-time</option>
                </select>
              </div>

              <div className="form-group full">
                <label className="form-label">Additional Notes</label>
                <textarea className="form-input" name="notes" rows={3} placeholder="Any context about your role, stack, or offer details..." value={form.notes} onChange={handleChange} style={{ resize: 'vertical' }} />
              </div>

            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button type="button" className="btn-ghost" style={{ padding: '13px 28px', fontSize: 15 }} onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '13px 32px', fontSize: 15, borderRadius: 10 }} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit for Review →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

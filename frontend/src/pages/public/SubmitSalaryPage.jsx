import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAppData } from '../../context/AppDataContext';
import CompanyLogo from '../../components/shared/CompanyLogo';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function SubmitSalaryPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { functions, getLevelsForFunction, functionsReady } = useAppData();

  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');

  // Company autocomplete
  const [companyQuery,    setCompanyQuery]    = useState('');
  const [companySelected, setCompanySelected] = useState(null);
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const searchTimeout   = useRef(null);
  const autocompleteRef = useRef(null);

  const [form, setForm] = useState({
    companyId:   '',
    companyName: '',
    jobTitle:    '',
    jobFunctionId:   '',
    functionLevelId: '',
    location:        '',
    baseSalary:      '',
    bonus:           '',
    equity:          '',
    yearsOfExperience: '',
    experienceLevel:   '',
    employmentType:    'FULL_TIME',
    notes: '',
  });

  // ── USD exchange rate — fetched once on mount ────────────────────────────
  const [usdRate, setUsdRate] = useState(84); // fallback ₹84/USD
  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(r => r.json())
      .then(d => { if (d?.rates?.INR) setUsdRate(Math.round(d.rates.INR)); })
      .catch(() => {}); // silently fall back to ₹84
  }, []);

  // Format a raw number into Indian short form e.g. 3200000 → ₹32L
  function fmtInr(val) {
    const n = Number(val);
    if (!val || isNaN(n) || n === 0) return null;
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
    if (n >= 100000)   return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    if (n >= 1000)     return `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return `₹${n}`;
  }

  // Format INR amount to USD
  function fmtUsd(val) {
    const n = Number(val);
    if (!val || isNaN(n) || n === 0) return null;
    const usd = Math.round(n / usdRate);
    if (usd >= 1000) return `$${(usd / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return `$${usd}`;
  }

  // ── Experience level auto-populate ────────────────────────────────────────
  const [levelAutoSet, setLevelAutoSet] = useState(false);

  function deriveLevel(years) {
    const y = Number(years);
    if (isNaN(y) || years === '') return '';
    if (y <= 1)  return 'INTERN';
    if (y <= 2)  return 'ENTRY';
    if (y <= 5)  return 'MID';
    if (y <= 8)  return 'SENIOR';
    if (y <= 12) return 'LEAD';
    if (y <= 16) return 'MANAGER';
    if (y <= 20) return 'DIRECTOR';
    return 'VP';
  }

  useEffect(() => {
    if (form.yearsOfExperience === '') return;
    const derived = deriveLevel(form.yearsOfExperience);
    if (derived) {
      setForm(f => ({ ...f, experienceLevel: derived }));
      setLevelAutoSet(true);
    }
  }, [form.yearsOfExperience]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Function → Level reactive dropdown ───────────────────────────────────
  const availableLevels = useMemo(
    () => getLevelsForFunction(form.jobFunctionId),
    [form.jobFunctionId, getLevelsForFunction]
  );

  // ── Company autocomplete ──────────────────────────────────────────────────
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

  function selectCompany(company) {
    setCompanySelected(company);
    setCompanyQuery(company.name);
    setForm(f => ({ ...f, companyId: company.id, companyName: company.name }));
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
    function handleClickOutside(e) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target))
        setShowSuggestions(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Generic field change ──────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'experienceLevel') setLevelAutoSet(false);
    if (name === 'jobFunctionId') {
      setForm(f => ({ ...f, jobFunctionId: value, functionLevelId: '' }));
      return;
    }
    setForm(f => ({ ...f, [name]: value }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.companyId && !form.companyName) { setError('Please enter or select a company name.'); return; }
    if (!form.jobFunctionId)    { setError('Please select a function.'); return; }
    if (!form.functionLevelId)  { setError('Please select a level.'); return; }
    if (!form.experienceLevel)  { setError('Please select an experience level.'); return; }
    if (!form.location)         { setError('Please select a location.'); return; }

    setSubmitting(true); setError('');
    try {
      await api.post('/salaries/submit', {
        ...(form.companyId   ? { companyId:   form.companyId }   : {}),
        ...(form.companyName ? { companyName: form.companyName } : {}),
        jobTitle:          form.jobTitle,
        jobFunctionId:     form.jobFunctionId     || null,
        functionLevelId:   form.functionLevelId   || null,
        location:          form.location,
        experienceLevel:   form.experienceLevel,
        employmentType:    form.employmentType,
        baseSalary:        Number(form.baseSalary) || 0,
        bonus:             Number(form.bonus)       || null,
        equity:            Number(form.equity)      || null,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : null,
      });
      setSuccess(true);
      setTimeout(() => navigate('/salaries'), 2000);
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.message ?? `Submission failed (${err.response?.status ?? 'network error'}). Please try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <section className="section" style={{ background: 'var(--ink-2)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>✓</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: 'var(--teal)', marginBottom: 12 }}>Submitted!</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 16 }}>Your salary entry is pending review. Redirecting…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section" style={{ background: 'var(--ink-2)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progressCrawl {
          0%   { width: 0%;  }
          40%  { width: 65%; }
          70%  { width: 82%; }
          100% { width: 90%; }
        }
      `}</style>

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

              {/* Company autocomplete */}
              <div className="form-group" ref={autocompleteRef} style={{ position: 'relative' }}>
                <label className="form-label">Company *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input" type="text"
                    placeholder="Type at least 3 characters to search…"
                    value={companyQuery} onChange={handleCompanyInput}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    autoComplete="off" required={!companySelected} style={{ paddingRight: 36 }}
                  />
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    {searchLoading ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                    ) : companySelected ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : companyQuery.length >= 3 ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    ) : null}
                  </div>
                </div>
                {!companySelected && companyQuery.length > 0 && companyQuery.length < 3 && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                    Type {3 - companyQuery.length} more character{3 - companyQuery.length !== 1 ? 's' : ''} to search…
                  </div>
                )}
                {companySelected && !(companySelected.isNew) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <CompanyLogo
                      companyId={companySelected.id}
                      companyName={companySelected.name}
                      logoUrl={companySelected.logoUrl}
                      website={companySelected.website}
                      size={22}
                      radius={4}
                    />
                    <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--teal)' }}>✓ Company selected</span>
                  </div>
                )}
                {companySelected && companySelected.isNew && (
                  <div style={{ fontSize: 11, marginTop: 4, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--gold)' }}>
                    ✦ New company — will be created on submit
                  </div>
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                    {suggestions.map((c, i) => (
                      <div key={c.id} onClick={() => selectCompany(c)}
                        style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}
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
                {showSuggestions && !searchLoading && suggestions.length === 0 && companyQuery.length >= 3 && !companySelected && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, marginTop: 4, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>No match found for <strong>"{companyQuery}"</strong></div>
                    <button type="button" onClick={useNewCompany} style={{ width: '100%', padding: '9px 16px', cursor: 'pointer', background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid rgba(62,207,176,0.3)', borderRadius: 8, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add "{companyQuery}" as new company
                    </button>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, textAlign: 'center', fontFamily: "'JetBrains Mono',monospace" }}>It will be auto-created when you submit</div>
                  </div>
                )}
                <input type="hidden" name="companyId" value={form.companyId} />
              </div>

              {/* Job Title */}
              <div className="form-group">
                <label className="form-label">Job Title *</label>
                <input className="form-input" name="jobTitle" placeholder="e.g. Software Engineer II" value={form.jobTitle} onChange={handleChange} required />
              </div>

              {/* Function */}
              <div className="form-group">
                <label className="form-label">Function *</label>
                <select className="form-input" name="jobFunctionId" required value={form.jobFunctionId} onChange={handleChange} style={{ cursor: 'pointer' }} disabled={!functionsReady}>
                  <option value="">{functionsReady ? 'Select function' : 'Loading…'}</option>
                  {functions.map(fn => <option key={fn.id} value={fn.id}>{fn.displayName}</option>)}
                </select>
              </div>

              {/* Level — reactive to selected function */}
              <div className="form-group">
                <label className="form-label">Level *</label>
                <select className="form-input" name="functionLevelId" required value={form.functionLevelId} onChange={handleChange} style={{ cursor: 'pointer' }} disabled={!form.jobFunctionId}>
                  <option value="">{form.jobFunctionId ? 'Select level' : 'Select a function first'}</option>
                  {availableLevels.map(lv => <option key={lv.id} value={lv.id}>{lv.name}</option>)}
                </select>
              </div>

              {/* Location */}
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

              {/* Employment Type */}
              <div className="form-group">
                <label className="form-label">Employment Type</label>
                <select className="form-input" name="employmentType" value={form.employmentType} onChange={handleChange} style={{ cursor: 'pointer' }}>
                  <option value="FULL_TIME">Full-time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="PART_TIME">Part-time</option>
                </select>
              </div>

              {/* ── Section divider: Compensation ── */}
              <div style={{ gridColumn:'1 / -1', display:'flex', alignItems:'center', gap:10, margin:'4px 0 -2px' }}>
                <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', whiteSpace:'nowrap' }}>Compensation</span>
                <div style={{ flex:1, height:'0.5px', background:'var(--border)' }} />
              </div>

              {/* Compensation — full-width row, internal 2-col grid matching parent */}
              <div style={{ gridColumn:'1 / -1', display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>

                {/* Base Salary */}
                <div className="form-group" style={{ margin:0 }}>
                  <label className="form-label">Base Salary (₹/yr) *</label>
                  <div style={{ position:'relative' }}>
                    <input
                      className="form-input"
                      name="baseSalary" type="number" min="0"
                      placeholder="e.g. 3200000"
                      value={form.baseSalary} onChange={handleChange} required
                      style={{ paddingRight: fmtInr(form.baseSalary) ? 68 : 12, height:38 }}
                    />
                    {fmtInr(form.baseSalary) && (
                      <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:12, fontWeight:600, color:'#059669', fontFamily:"'IBM Plex Mono',monospace", pointerEvents:'none', whiteSpace:'nowrap' }}>
                        {fmtInr(form.baseSalary)}
                      </span>
                    )}
                  </div>
                  {fmtInr(form.baseSalary) && (
                    <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", marginTop:3, display:'block' }}>
                      {Number(form.baseSalary).toLocaleString('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 })} / yr
                    </span>
                  )}
                </div>

                {/* Bonus */}
                <div className="form-group" style={{ margin:0 }}>
                  <label className="form-label">Bonus (₹/yr)</label>
                  <div style={{ position:'relative' }}>
                    <input
                      className="form-input"
                      name="bonus" type="number" min="0"
                      placeholder="e.g. 500000"
                      value={form.bonus} onChange={handleChange}
                      style={{ paddingRight: fmtInr(form.bonus) ? 68 : 12, height:38 }}
                    />
                    {fmtInr(form.bonus) && (
                      <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:12, fontWeight:600, color:'#059669', fontFamily:"'IBM Plex Mono',monospace", pointerEvents:'none', whiteSpace:'nowrap' }}>
                        {fmtInr(form.bonus)}
                      </span>
                    )}
                  </div>
                  {fmtInr(form.bonus) && (
                    <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", marginTop:3, display:'block' }}>
                      {Number(form.bonus).toLocaleString('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 })} / yr
                    </span>
                  )}
                </div>

                {/* RSU / Equity */}
                <div className="form-group" style={{ margin:0 }}>
                  <label className="form-label">Equity / RSU (₹/yr)</label>
                  <div style={{ position:'relative' }}>
                    <input
                      className="form-input"
                      name="equity" type="number" min="0"
                      placeholder="e.g. 1500000"
                      value={form.equity} onChange={handleChange}
                      style={{ paddingRight: fmtInr(form.equity) ? 68 : 12, height:38 }}
                    />
                    {fmtInr(form.equity) && (
                      <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:12, fontWeight:600, color:'#059669', fontFamily:"'IBM Plex Mono',monospace", pointerEvents:'none', whiteSpace:'nowrap' }}>
                        {fmtInr(form.equity)}
                      </span>
                    )}
                  </div>
                  {fmtInr(form.equity) && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
                      <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
                        {Number(form.equity).toLocaleString('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 })} / yr
                      </span>
                      {fmtUsd(form.equity) && (
                        <>
                          <span style={{ fontSize:10, color:'var(--color-border-tertiary)' }}>·</span>
                          <span style={{ fontSize:10, color:'#185FA5', fontFamily:"'IBM Plex Mono',monospace", fontWeight:500 }}>
                            ≈ {fmtUsd(form.equity)} &nbsp;@ ₹{usdRate}/USD
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Empty cell to balance the grid */}
                <div />

              </div>

              {/* ── Section divider: Experience ── */}
              <div style={{ gridColumn:'1 / -1', display:'flex', alignItems:'center', gap:10, margin:'4px 0 -2px' }}>
                <span style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', whiteSpace:'nowrap' }}>Experience</span>
                <div style={{ flex:1, height:'0.5px', background:'var(--border)' }} />
              </div>

              {/* Years of Experience */}
              <div className="form-group">
                <label className="form-label">Years of Experience *</label>
                <input className="form-input" name="yearsOfExperience" type="number" min="0" max="50" placeholder="e.g. 4" value={form.yearsOfExperience} onChange={handleChange} required />
              </div>

              {/* Experience Level — auto-populated from YOE, editable */}
              <div className="form-group">
                <label className="form-label">
                  Experience Level
                  {levelAutoSet && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--teal)', fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>
                      ✓ auto-filled
                    </span>
                  )}
                </label>
                <select className="form-input" name="experienceLevel" value={form.experienceLevel} onChange={handleChange} style={{ cursor: 'pointer' }}>
                  <option value="">Select level</option>
                  <option value="INTERN">Intern (0–1 yr)</option>
                  <option value="ENTRY">Junior / Entry (1–2 yrs)</option>
                  <option value="MID">Mid-level (2–5 yrs)</option>
                  <option value="SENIOR">Senior (5–8 yrs)</option>
                  <option value="LEAD">Lead / Staff (8–12 yrs)</option>
                  <option value="MANAGER">Manager (12–16 yrs)</option>
                  <option value="DIRECTOR">Director (16–20 yrs)</option>
                  <option value="VP">VP / SVP (20+ yrs)</option>
                  <option value="C_LEVEL">C-Level (manual only)</option>
                </select>
                {levelAutoSet && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                    Auto-filled from years of experience · you can override this
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="form-group full">
                <label className="form-label">Additional Notes</label>
                <textarea className="form-input" name="notes" rows={3} placeholder="Any context about your role, stack, or offer details..." value={form.notes} onChange={handleChange} style={{ resize: 'vertical' }} />
              </div>

            </div>

            {/* Submit */}
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="form-submit-row">
                <button type="button" className="btn-ghost form-submit-btn" style={{ padding: '13px 28px', fontSize: 15 }} onClick={() => navigate(-1)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary form-submit-btn" disabled={submitting}
                  style={{ padding: '13px 32px', fontSize: 15, borderRadius: 10, opacity: submitting ? 0.65 : 1, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity 0.2s ease' }}>
                  {submitting ? (
                    <>
                      <div style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                      Submitting…
                    </>
                  ) : 'Submit for Review →'}
                </button>
              </div>
              {submitting && (
                <div style={{ width: '100%', height: 3, background: 'rgba(14,165,233,0.15)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius: 99, animation: 'progressCrawl 3s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

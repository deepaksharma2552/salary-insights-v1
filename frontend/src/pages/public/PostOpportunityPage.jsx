import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

const TYPE_OPTIONS = [
  { value: 'REFERRAL',   label: 'Referral',          hint: 'I can refer someone to this company' },
  { value: 'INTERNSHIP', label: 'Internship',         hint: 'Internship opening — stipend-based' },
  { value: 'FULL_TIME',  label: 'Full-time',          hint: 'Permanent / full-time opening' },
  { value: 'CONTRACT',   label: 'Contract',           hint: 'Fixed-term or freelance contract' },
  { value: 'DRIVE',      label: 'Off-campus drive',   hint: 'Campus or off-campus recruitment drive' },
];

const MODE_OPTIONS = ['ONSITE', 'HYBRID', 'REMOTE'];

export default function PostOpportunityPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  // Company autocomplete
  const [companyQuery,    setCompanyQuery]    = useState('');
  const [companySelected, setCompanySelected] = useState(null);
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const searchTimeout   = useRef(null);
  const autocompleteRef = useRef(null);

  const [form, setForm] = useState({
    title:              '',
    companyId:          '',
    companyName:        '',
    type:               'INTERNSHIP',
    role:               '',
    location:           '',
    workMode:           'ONSITE',
    applyLink:          '',
    stipendOrSalary:    '',
    experienceRequired: '',
    deadline:           '',
    description:        '',
  });

  // ── Company autocomplete ──────────────────────────────────────────────────
  const searchCompanies = useCallback((q) => {
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    setSearchLoading(true);
    api.get('/public/companies', { params: { name: q, size: 8, page: 0 } })
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

  // ── Form handlers ─────────────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!companySelected) { setError('Please select or enter a company name.'); return; }
    if (!form.applyLink.startsWith('http')) { setError('Apply link must be a valid URL starting with http.'); return; }

    setSubmitting(true);
    setError('');

    const payload = {
      title:              form.title.trim(),
      companyName:        companySelected.name,
      companyId:          form.companyId || undefined,
      type:               form.type,
      role:               form.role || undefined,
      location:           form.location || undefined,
      workMode:           form.workMode,
      applyLink:          form.applyLink.trim(),
      stipendOrSalary:    form.stipendOrSalary || undefined,
      experienceRequired: form.experienceRequired || undefined,
      deadline:           form.deadline || undefined,
      description:        form.description || undefined,
    };

    try {
      await api.post('/public/opportunities', payload);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.error ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <section className="section" style={{ maxWidth: 600 }}>
        <div className="form-card-padded" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Opportunity submitted!</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
            Your posting is under review. An admin will verify the link and make it live shortly.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => navigate('/opportunities')} className="btn-primary">
              Browse Opportunities
            </button>
            <button onClick={() => { setSuccess(false); setForm({ title:'', companyId:'', companyName:'', type:'INTERNSHIP', role:'', location:'', workMode:'ONSITE', applyLink:'', stipendOrSalary:'', experienceRequired:'', deadline:'', description:'' }); setCompanyQuery(''); setCompanySelected(null); }} className="btn-ghost">
              Post another
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <section className="section" style={{ maxWidth: 680 }}>

      <div style={{ marginBottom: 28 }}>
        <span className="section-tag">Community</span>
        <h2 className="section-title">Post an <em>Opportunity</em></h2>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>
          Spotted a referral, internship or opening? Share it — your post goes live after a quick admin review.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--red-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div className="post-opp-card" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <form onSubmit={handleSubmit}>

          {/* Type selector — prominent, top of form */}
          <div className="form-group full" style={{ marginBottom: 24 }}>
            <label className="form-label">Opportunity type</label>
            <div className="grid-5col">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                  style={{
                    padding: '10px 8px', border: `1.5px solid ${form.type === opt.value ? 'var(--blue)' : 'var(--border)'}`,
                    borderRadius: 8, background: form.type === opt.value ? 'var(--blue-dim)' : 'var(--bg-2)',
                    color: form.type === opt.value ? 'var(--blue)' : 'var(--text-2)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Inter,sans-serif',
                    textAlign: 'center', transition: 'all 0.12s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
              {TYPE_OPTIONS.find(o => o.value === form.type)?.hint}
            </div>
          </div>

          <div className="form-grid">

            {/* Title */}
            <div className="form-group full">
              <label className="form-label">Title <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="form-input" name="title" value={form.title} onChange={handleChange}
                placeholder="e.g. SDE II opening at Amazon — referral available" required maxLength={200} />
            </div>

            {/* Company autocomplete */}
            <div className="form-group" ref={autocompleteRef} style={{ position: 'relative' }}>
              <label className="form-label">Company <span style={{ color: 'var(--red)' }}>*</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {companySelected && !companySelected.isNew && (
                  <CompanyLogo
                    companyId={companySelected.id}
                    companyName={companySelected.name}
                    logoUrl={companySelected.logoUrl}
                    website={companySelected.website}
                    size={28}
                    radius={6}
                  />
                )}
                <input
                  className="form-input"
                  value={companyQuery}
                  onChange={handleCompanyInput}
                  placeholder="Search or type company name…"
                  autoComplete="off"
                />
              </div>
              {companySelected && companySelected.isNew && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  + New company will be created
                </div>
              )}
              {companySelected && !companySelected.isNew && (
                <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--teal)', marginTop: 4 }}>
                  ✓ Company selected
                </div>
              )}
              {showSuggestions && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', marginTop: 4 }}>
                  {searchLoading && <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-3)' }}>Searching…</div>}
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
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</div>
                        {c.industry && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{c.industry}</div>}
                      </div>
                    </div>
                  ))}
                  {suggestions.length > 0 && (
                    <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono',monospace", borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                      {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found
                    </div>
                  )}
                  {!searchLoading && companyQuery.trim() && (
                    <div onClick={useNewCompany}
                      style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--blue)', fontWeight: 500, borderTop: suggestions.length > 0 ? 'none' : '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >+ Use "{companyQuery.trim()}"</div>
                  )}
                </div>
              )}
            </div>

            {/* Role */}
            <div className="form-group">
              <label className="form-label">Role / Position</label>
              <input className="form-input" name="role" value={form.role} onChange={handleChange}
                placeholder="e.g. SDE II, Data Science Intern" maxLength={200} />
            </div>

            {/* Apply link */}
            <div className="form-group full">
              <label className="form-label">Apply link <span style={{ color: 'var(--red)' }}>*</span></label>
              <input className="form-input" name="applyLink" value={form.applyLink} onChange={handleChange}
                placeholder="https://…" type="url" required />
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                Direct application URL — candidates click this to apply. Must be a working link.
              </div>
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-input" name="location" value={form.location} onChange={handleChange} style={{ cursor: 'pointer' }}>
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

            {/* Work mode */}
            <div className="form-group">
              <label className="form-label">Work mode</label>
              <select className="form-input" name="workMode" value={form.workMode} onChange={handleChange}>
                {MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Stipend / Salary */}
            <div className="form-group">
              <label className="form-label">Pay / Stipend</label>
              <input className="form-input" name="stipendOrSalary" value={form.stipendOrSalary} onChange={handleChange}
                placeholder="e.g. ₹35k/month, ₹20–30L, Unpaid" maxLength={100} />
            </div>

            {/* Experience */}
            <div className="form-group">
              <label className="form-label">Experience required</label>
              <input className="form-input" name="experienceRequired" value={form.experienceRequired} onChange={handleChange}
                placeholder="e.g. 2–5 yrs, Fresher, Final year" maxLength={100} />
            </div>

            {/* Deadline */}
            <div className="form-group">
              <label className="form-label">Application deadline</label>
              <input className="form-input" name="deadline" value={form.deadline} onChange={handleChange}
                type="date" min={new Date().toISOString().split('T')[0]} />
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                Auto-expires after 30 days if left blank.
              </div>
            </div>

            {/* Description */}
            <div className="form-group full">
              <label className="form-label">Additional notes</label>
              <textarea className="form-input" name="description" value={form.description} onChange={handleChange}
                rows={3} maxLength={2000}
                placeholder="Any extra context — team, tech stack, hiring manager contact, etc."
                style={{ resize: 'vertical', minHeight: 80 }} />
            </div>

          </div>

          {/* Submit */}
          <div style={{ marginTop: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" className="btn-primary" disabled={submitting}
              style={{ minWidth: 160 }}>
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => navigate('/opportunities')}>
              Cancel
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>
              Your post goes live after admin review.
            </span>
          </div>

        </form>
      </div>
    </section>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function SubmitSalaryPage() {
  const navigate  = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState('');

  const [form, setForm] = useState({
    companyId: '',
    jobTitle: '',
    companyInternalLevel: '',
    location: '',
    baseSalary: '',
    bonus: '',
    equity: '',
    yearsOfExperience: '',
    experienceLevel: '',
    employmentType: 'FULL_TIME',
    notes: '',
  });

  // Load companies for the dropdown
  useEffect(() => {
    api.get('/public/companies')
      .then(r => setCompanies(r.data?.data?.content ?? []))
      .catch(console.error);
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/salaries/submit', {
        ...form,
        baseSalary:         Number(form.baseSalary)         || 0,
        bonus:              Number(form.bonus)              || 0,
        equity:             Number(form.equity)             || 0,
        yearsOfExperience:  Number(form.yearsOfExperience)  || 0,
      });
      setSuccess(true);
      setTimeout(() => navigate('/salaries'), 2000);
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.message ?? 'Submission failed. Please try again.');
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

              <div className="form-group">
                <label className="form-label">Company *</label>
                <select className="form-input" name="companyId" value={form.companyId} onChange={handleChange} required style={{ cursor: 'pointer' }}>
                  <option value="">Select company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Job Title *</label>
                <input className="form-input" name="jobTitle" placeholder="e.g. Software Engineer II" value={form.jobTitle} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label className="form-label">Internal Level</label>
                <input className="form-input" name="companyInternalLevel" placeholder="e.g. SDE-II, L5, IC3" value={form.companyInternalLevel} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Location *</label>
                <input className="form-input" name="location" placeholder="e.g. Bengaluru" value={form.location} onChange={handleChange} required />
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
                <label className="form-label">Experience Level</label>
                <select className="form-input" name="experienceLevel" value={form.experienceLevel} onChange={handleChange} style={{ cursor: 'pointer' }}>
                  <option value="">Select level</option>
                  <option value="JUNIOR">Junior (0–2 yrs)</option>
                  <option value="MID">Mid (2–5 yrs)</option>
                  <option value="SENIOR">Senior (5–8 yrs)</option>
                  <option value="LEAD">Lead (8+ yrs)</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="VP">VP</option>
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

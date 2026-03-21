import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import TopProgressBar from '../../components/shared/TopProgressBar';

const ROUND_TYPES = [
  { value:'DSA',           label:'DSA / Coding' },
  { value:'SYSTEM_DESIGN', label:'System Design' },
  { value:'HR',            label:'HR / Behavioural' },
  { value:'MANAGERIAL',    label:'Managerial' },
  { value:'FULL_LOOP',     label:'Full Interview Loop' },
];

export default function SubmitExperiencePage() {
  const navigate = useNavigate();
  const [companyId,   setCompanyId]   = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyObj,  setCompanyObj]  = useState(null);
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const [roundType,   setRoundType]   = useState('');
  const [year,        setYear]        = useState(new Date().getFullYear());
  const [gotOffer,    setGotOffer]    = useState(null); // null | true | false
  const [experience,  setExperience]  = useState('');
  const [questions,   setQuestions]   = useState(['']);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  const searchCompanies = useCallback((q) => {
    if (q.length < 2) { setSuggestions([]); setShowSug(false); return; }
    api.get('/public/companies', { params: { name: q, size: 8, page: 0 } })
      .then(r => { setSuggestions(r.data?.data?.content ?? []); setShowSug(true); })
      .catch(console.error);
  }, []);

  function handleQueryChange(e) {
    const v = e.target.value;
    setQuery(v); setCompanyId(''); setCompanyObj(null); setCompanyName(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCompanies(v), 300);
  }

  function selectCompany(c) {
    setCompanyId(c.id); setCompanyObj(c);
    setCompanyName(c.name); setQuery(c.name);
    setSuggestions([]); setShowSug(false);
  }

  function addQuestion()         { setQuestions(prev => [...prev, '']); }
  function updateQ(i, v)         { setQuestions(prev => prev.map((q, idx) => idx === i ? v : q)); }
  function removeQ(i)            { setQuestions(prev => prev.filter((_, idx) => idx !== i)); }

  async function submit(e) {
    e.preventDefault();
    if (!roundType)       { setError('Please select a round type.'); return; }
    if (!experience.trim()) { setError('Please describe your experience.'); return; }
    setSaving(true); setError(''); TopProgressBar.start();
    try {
      await api.post('/public/launchpad/experiences', {
        companyId:   companyId || null,
        companyName: companyName.trim() || null,
        roundType,
        year:        year || null,
        gotOffer,
        experience:  experience.trim(),
        questions:   questions.filter(q => q.trim()),
      });
      TopProgressBar.done();
      navigate('/launchpad?tab=EXPERIENCES&submitted=1');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Submission failed.');
      TopProgressBar.done();
    } finally { setSaving(false); }
  }

  return (
    <section className="section" style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <span className="section-tag">Launchpad</span>
        <h2 className="section-title" style={{ fontSize: 28 }}>Share Your <em>Experience</em></h2>
        <p style={{ color:'var(--text-2)', fontSize:14, marginTop:6 }}>
          Help the community prepare — share your interview story anonymously. All submissions are reviewed before going live.
        </p>
      </div>

      <form onSubmit={submit}>
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Company */}
          <div className="form-group">
            <label className="form-label">Company</label>
            <div ref={wrapRef} style={{ position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {companyObj && <CompanyLogo companyId={companyObj.id} companyName={companyObj.name} logoUrl={companyObj.logoUrl} website={companyObj.website} size={28} radius={6} />}
                <input className="form-input" value={query} onChange={handleQueryChange}
                  onFocus={() => suggestions.length > 0 && setShowSug(true)}
                  placeholder="Search for a company…" autoComplete="off" />
              </div>
              {showSug && suggestions.length > 0 && (
                <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:50, background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
                  {suggestions.map((c, i) => (
                    <div key={c.id} onClick={() => selectCompany(c)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer', borderBottom: i < suggestions.length-1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg-2)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={26} radius={6} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:'var(--text-1)' }}>{c.name}</div>
                        {c.industry && <div style={{ fontSize:11, color:'var(--text-3)' }}>{c.industry}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!companyId && companyName && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>Not found in our list — we'll use the name you typed.</div>}
          </div>

          {/* Round type */}
          <div className="form-group">
            <label className="form-label">Interview round *</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
              {ROUND_TYPES.map(rt => (
                <button key={rt.value} type="button" onClick={() => setRoundType(rt.value)}
                  style={{ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .12s', background:roundType===rt.value?'#3b82f6':'var(--bg-2)', color:roundType===rt.value?'#fff':'var(--text-2)', border:roundType===rt.value?'1px solid #3b82f6':'1px solid var(--border)' }}>
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Year + Offer */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input className="form-input" type="number" min={2015} max={new Date().getFullYear()}
                value={year} onChange={e => setYear(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Outcome</label>
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                {[{ v:true, label:'Got offer' }, { v:false, label:'No offer' }, { v:null, label:'Not sure' }].map(o => (
                  <button key={String(o.v)} type="button" onClick={() => setGotOffer(o.v)}
                    style={{ flex:1, padding:'7px 0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .12s', background:gotOffer===o.v?'#3b82f6':'var(--bg-2)', color:gotOffer===o.v?'#fff':'var(--text-2)', border:gotOffer===o.v?'1px solid #3b82f6':'1px solid var(--border)' }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Experience write-up */}
          <div className="form-group">
            <label className="form-label">Your experience * <span style={{ fontWeight:400, color:'var(--text-3)', fontSize:11 }}>(process, difficulty, tips)</span></label>
            <textarea className="form-input" rows={6} value={experience} onChange={e => setExperience(e.target.value)}
              placeholder="Describe the interview process — how many rounds, what topics came up, how the overall experience was, any tips for future candidates…"
              style={{ resize:'vertical' }} />
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>{experience.length} characters</div>
          </div>

          {/* Questions */}
          <div className="form-group">
            <label className="form-label">Questions asked <span style={{ fontWeight:400, color:'var(--text-3)', fontSize:11 }}>(optional)</span></label>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
              {questions.map((q, i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input className="form-input" value={q} onChange={e => updateQ(i, e.target.value)}
                    placeholder={`Question ${i+1} — e.g. "Design a URL shortener"`} style={{ flex:1 }} />
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQ(i)}
                      style={{ padding:'8px 12px', background:'var(--rose-dim)', color:'var(--rose)', border:'1px solid rgba(224,92,122,0.2)', borderRadius:8, cursor:'pointer', fontSize:12 }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addQuestion}
                style={{ alignSelf:'flex-start', padding:'6px 14px', borderRadius:8, border:'1px dashed var(--border)', background:'transparent', color:'var(--text-3)', fontSize:12, cursor:'pointer' }}>
                + Add question
              </button>
            </div>
          </div>

          {error && <div style={{ padding:'12px 16px', background:'var(--rose-dim)', border:'1px solid rgba(224,92,122,0.2)', borderRadius:10, color:'var(--rose)', fontSize:13 }}>{error}</div>}

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button type="button" className="btn-ghost" onClick={() => navigate('/launchpad')}>Cancel</button>
            <button type="submit" disabled={saving}
              style={{ padding:'10px 24px', borderRadius:9, background:'#3b82f6', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:saving?'not-allowed':'pointer', opacity:saving?.6:1 }}>
              {saving ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

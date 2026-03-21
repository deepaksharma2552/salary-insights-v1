import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLaunchpad } from '../../context/LaunchpadContext';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import TopProgressBar from '../../components/shared/TopProgressBar';

const TABS = [
  { key: 'CODING',        label: 'Coding Problems',     icon: '{ }' },
  { key: 'SYSTEM_DESIGN', label: 'System Design',        icon: '⬡'  },
  { key: 'ARTICLE',       label: 'Articles',             icon: '↗'  },
  { key: 'EXPERIENCES',   label: 'Interview Experiences',icon: '✦'  },
];

const DIFFICULTY_COLORS = {
  EASY:   { bg: 'rgba(34,197,94,0.1)',  color: '#16a34a', border: 'rgba(34,197,94,0.25)' },
  MEDIUM: { bg: 'rgba(234,179,8,0.1)',  color: '#ca8a04', border: 'rgba(234,179,8,0.25)' },
  HARD:   { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', border: 'rgba(239,68,68,0.25)' },
};

const ROUND_COLORS = {
  DSA:           { label: 'DSA',            color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  SYSTEM_DESIGN: { label: 'System Design',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  HR:            { label: 'HR',             color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'  },
  MANAGERIAL:    { label: 'Managerial',     color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
  FULL_LOOP:     { label: 'Full Loop',      color: '#e11d48', bg: 'rgba(225,29,72,0.1)'  },
};

function DifficultyBadge({ difficulty }) {
  if (!difficulty) return null;
  const c = DIFFICULTY_COLORS[difficulty] ?? DIFFICULTY_COLORS.MEDIUM;
  return (
    <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:99, fontSize:10, fontWeight:700, background:c.bg, color:c.color, border:`1px solid ${c.border}`, fontFamily:"'JetBrains Mono',monospace", letterSpacing:'.04em' }}>
      {difficulty}
    </span>
  );
}

function RoundBadge({ roundType }) {
  const c = ROUND_COLORS[roundType] ?? ROUND_COLORS.DSA;
  return (
    <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:99, fontSize:10, fontWeight:700, background:c.bg, color:c.color, border:`1px solid ${c.color}30`, fontFamily:"'JetBrains Mono',monospace" }}>
      {c.label}
    </span>
  );
}

/* ── Resource card ────────────────────────────────────────────────────────── */
function ResourceCard({ r }) {
  return (
    <div style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text-1)', lineHeight:1.4 }}>{r.title}</div>
          {r.topic && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4, fontFamily:"'JetBrains Mono',monospace" }}>{r.topic}</div>}
        </div>
        <DifficultyBadge difficulty={r.difficulty} />
      </div>

      {r.description && (
        <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6 }}>{r.description}</div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
        {r.companies?.length > 0 ? (
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {r.companies.map(co => (
              <span key={co} style={{ fontSize:10, padding:'2px 8px', borderRadius:99, background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-3)', fontWeight:500 }}>{co}</span>
            ))}
          </div>
        ) : <div />}

        {r.link && (
          <a href={r.link} target="_blank" rel="noopener noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8, background:'rgba(59,130,246,0.08)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.25)', fontSize:12, fontWeight:600, textDecoration:'none', flexShrink:0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open
          </a>
        )}
      </div>
    </div>
  );
}

/* ── Resources tab ────────────────────────────────────────────────────────── */
function ResourcesTab({ type }) {
  const { getFiltered, allCompanies, resourcesReady } = useLaunchpad();
  const [difficulty, setDifficulty] = useState('');
  const [company,    setCompany]    = useState('');

  const companies  = allCompanies();
  const resources  = getFiltered(type, difficulty || null, company || null);

  if (!resourcesReady) {
    return (
      <div style={{ padding:'32px 0 28px' }}>
        <div style={{ width:'100%', height:3, background:'var(--bg-3)', borderRadius:99, overflow:'hidden' }}>
          <div style={{ height:'100%', background:'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius:99, animation:'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
        </div>
        <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Filters — client-side, instant */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:24, alignItems:'center' }}>
        {type === 'CODING' || type === 'SYSTEM_DESIGN' ? (
          <>
            <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:500 }}>Difficulty:</span>
            {['','EASY','MEDIUM','HARD'].map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                style={{ padding:'5px 14px', borderRadius:99, fontSize:12, fontWeight:500, cursor:'pointer', border:`1px solid ${difficulty===d?'#3b82f6':'var(--border)'}`, background:difficulty===d?'rgba(59,130,246,0.1)':'transparent', color:difficulty===d?'#3b82f6':'var(--text-2)', transition:'all .15s' }}>
                {d || 'All'}
              </button>
            ))}
          </>
        ) : null}

        {companies.length > 0 && (
          <>
            <span style={{ fontSize:12, color:'var(--text-3)', fontWeight:500, marginLeft:8 }}>Company:</span>
            <select value={company} onChange={e => setCompany(e.target.value)}
              className="select-field" style={{ fontSize:12, padding:'5px 28px 5px 10px' }}>
              <option value="">All companies</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}

        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace" }}>
          {resources.length} result{resources.length !== 1 ? 's' : ''}
        </span>
      </div>

      {resources.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
          <div style={{ fontSize:15, color:'var(--text-2)' }}>No resources found</div>
          <div style={{ fontSize:13, marginTop:6 }}>Try adjusting filters</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
          {resources.map(r => <ResourceCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}

/* ── Experiences tab ──────────────────────────────────────────────────────── */
function ExperiencesTab() {
  const { user } = useContext(AuthContext);
  const [experiences, setExperiences] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [cursor,      setCursor]      = useState(null);
  const [hasMore,     setHasMore]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [roundFilter, setRoundFilter] = useState('');
  const [search,      setSearch]      = useState('');
  const [inputVal,    setInputVal]    = useState('');
  const [expanded,    setExpanded]    = useState(null);
  const debounceRef = useRef(null);

  const fetchExperiences = useCallback((reset = true) => {
    if (reset) { setLoading(true); setError(null); }
    else         setLoadingMore(true);

    const params = {};
    if (roundFilter) params.roundType = roundFilter;
    if (search)      params.search    = search;
    if (!reset && cursor) params.cursor = cursor;

    TopProgressBar.start();
    api.get('/public/launchpad/experiences', { params })
      .then(r => {
        const data = r.data?.data;
        if (reset) setExperiences(data?.content ?? []);
        else       setExperiences(prev => [...prev, ...(data?.content ?? [])]);
        setCursor(data?.nextCursor ?? null);
        setHasMore(data?.hasMore ?? false);
      })
      .catch(err => setError(err.response?.data?.message ?? err.message))
      .finally(() => { setLoading(false); setLoadingMore(false); TopProgressBar.done(); });
  }, [roundFilter, search, cursor]);

  // Reset and refetch when filters change
  useEffect(() => {
    setCursor(null);
    fetchExperiences(true);
  }, [roundFilter, search]); // eslint-disable-line

  function handleSearchChange(e) {
    const v = e.target.value;
    setInputVal(v);
    clearTimeout(debounceRef.current);
    if (v.length === 0)  { setSearch(''); return; }
    if (v.length < 2)    return;
    debounceRef.current = setTimeout(() => setSearch(v), 500);
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:24, alignItems:'center' }}>
        {/* Search */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:10, minWidth:240, flex:1, maxWidth:340 }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--text-3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={inputVal} onChange={handleSearchChange} placeholder="Search by company, topic…"
            style={{ flex:1, border:'none', background:'transparent', fontSize:13, color:'var(--text-1)', outline:'none' }} />
          {inputVal && <span onClick={() => { setInputVal(''); setSearch(''); }} style={{ cursor:'pointer', color:'var(--text-3)', fontSize:15, lineHeight:1 }}>×</span>}
        </div>

        {/* Round type filter */}
        <select value={roundFilter} onChange={e => setRoundFilter(e.target.value)}
          className="select-field" style={{ fontSize:12 }}>
          <option value="">All rounds</option>
          {Object.entries(ROUND_COLORS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {user && (
          <Link to="/launchpad/submit"
            style={{ marginLeft:'auto', padding:'8px 18px', borderRadius:9, background:'#3b82f6', color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none', flexShrink:0 }}>
            + Share Experience
          </Link>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding:'32px 0' }}>
          <div style={{ width:'100%', height:3, background:'var(--bg-3)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius:99, animation:'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
          </div>
          <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ padding:'14px 18px', background:'var(--rose-dim)', border:'1px solid rgba(224,92,122,0.2)', borderRadius:10, color:'var(--rose)', fontSize:13 }}>{error}</div>}

      {/* Empty */}
      {!loading && !error && experiences.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text-3)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>✦</div>
          <div style={{ fontSize:15, color:'var(--text-2)', marginBottom:6 }}>No experiences yet</div>
          {user
            ? <Link to="/launchpad/submit" style={{ color:'#3b82f6', fontSize:13 }}>Be the first to share yours →</Link>
            : <div style={{ fontSize:13 }}>Sign in to share your interview experience</div>}
        </div>
      )}

      {/* Experiences list */}
      {!loading && !error && experiences.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {experiences.map(exp => (
            <div key={exp.id} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
              {/* Card header */}
              <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}
                onClick={() => setExpanded(expanded === exp.id ? null : exp.id)}>
                {exp.companyId && (
                  <CompanyLogo companyId={exp.companyId} companyName={exp.companyName} size={36} radius={9} />
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'var(--text-1)' }}>
                    {exp.companyName || 'Unknown Company'}
                    {exp.year && <span style={{ fontWeight:400, color:'var(--text-3)', fontSize:12, marginLeft:8 }}>{exp.year}</span>}
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:5, flexWrap:'wrap', alignItems:'center' }}>
                    <RoundBadge roundType={exp.roundType} />
                    {exp.gotOffer !== null && exp.gotOffer !== undefined && (
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:exp.gotOffer?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)', color:exp.gotOffer?'#16a34a':'#dc2626', border:`1px solid ${exp.gotOffer?'rgba(34,197,94,0.25)':'rgba(239,68,68,0.25)'}` }}>
                        {exp.gotOffer ? '✓ Offer received' : '✗ No offer'}
                      </span>
                    )}
                    <span style={{ fontSize:11, color:'var(--text-3)', marginLeft:'auto', fontFamily:"'JetBrains Mono',monospace" }}>
                      by {exp.submittedByName || 'Anonymous'}
                    </span>
                  </div>
                </div>
                <span style={{ color:'var(--text-3)', fontSize:12 }}>{expanded === exp.id ? '▲' : '▼'}</span>
              </div>

              {/* Expanded body */}
              {expanded === exp.id && (
                <div style={{ padding:'0 20px 20px', borderTop:'1px solid var(--border)' }}>
                  <div style={{ paddingTop:16, fontSize:13, color:'var(--text-2)', lineHeight:1.75, whiteSpace:'pre-wrap' }}>
                    {exp.experience}
                  </div>
                  {exp.questions?.length > 0 && (
                    <div style={{ marginTop:16 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Questions asked</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {exp.questions.map((q, i) => (
                          <div key={i} style={{ display:'flex', gap:10, padding:'8px 12px', background:'var(--bg-2)', borderRadius:8, border:'1px solid var(--border)' }}>
                            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', fontFamily:"'JetBrains Mono',monospace", flexShrink:0 }}>Q{i+1}</span>
                            <span style={{ fontSize:12, color:'var(--text-1)' }}>{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div style={{ textAlign:'center', marginTop:24 }}>
          <button onClick={() => fetchExperiences(false)} disabled={loadingMore}
            style={{ padding:'10px 28px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg-2)', color:'var(--text-2)', fontSize:13, fontWeight:500, cursor:'pointer', opacity:loadingMore?.6:1 }}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Stats bar ────────────────────────────────────────────────────────────── */
function StatsBar({ stats }) {
  if (!stats) return null;
  const items = [
    { label:'Coding problems',   value: stats.codingProblems          },
    { label:'System design Qs',  value: stats.systemDesignQuestions   },
    { label:'Articles',          value: stats.articles                },
    { label:'Interview stories', value: stats.interviewExperiences    },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12, marginBottom:32 }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{ background:'var(--panel)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px' }}>
          <div style={{ fontSize:24, fontWeight:700, color:'var(--text-1)', fontFamily:"'JetBrains Mono',monospace" }}>{value ?? '—'}</div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4, fontWeight:500 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function LaunchpadPage() {
  const [activeTab, setActiveTab] = useState('CODING');
  const { stats, reload } = useLaunchpad();

  // Revalidate resources when user navigates to this page
  // (catches the case where admin added resources in another tab)
  useEffect(() => { reload(); }, []); // eslint-disable-line

  return (
    <section className="section">
      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <span className="section-tag">Launchpad</span>
        <h2 className="section-title">Career <em>Launchpad</em></h2>
        <p style={{ color:'var(--text-2)', fontSize:14, marginTop:6, maxWidth:560 }}>
          Everything you need to land your first role at a top product company — curated coding problems, system design questions, and real interview experiences from the community.
        </p>
      </div>

      <StatsBar stats={stats} />

      {/* Tab bar */}
      <div style={{ display:'flex', gap:4, marginBottom:28, borderBottom:'1px solid var(--border)', paddingBottom:0, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding:'10px 18px', fontSize:13, fontWeight:600, cursor:'pointer',
              background:'transparent', border:'none',
              borderBottom: activeTab === t.key ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === t.key ? '#3b82f6' : 'var(--text-2)',
              marginBottom:-1, display:'flex', alignItems:'center', gap:7,
              transition:'all .15s',
            }}>
            <span style={{ fontSize:14, fontFamily:"'JetBrains Mono',monospace" }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'EXPERIENCES'
        ? <ExperiencesTab />
        : <ResourcesTab type={activeTab} />
      }
    </section>
  );
}

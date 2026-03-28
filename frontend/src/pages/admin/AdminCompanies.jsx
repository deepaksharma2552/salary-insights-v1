import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import TopProgressBar from '../../components/shared/TopProgressBar';

const BENEFIT_PRESETS = [
  'ESOPs', 'Health insurance', 'Dental & vision', 'Relocation',
  'Learning budget', 'Meal allowance', 'WFH / Remote', 'Parental leave', 'Gym / wellness',
];

const EMPTY = { name: '', industry: '', website: '', description: '', benefits: [] };
const SEARCH_MIN  = 3;
const SEARCH_WAIT = 600;
const SIZE_OPTIONS = [10, 25, 50];

// ── Popular Indian tech company seeds for KG search ──────────────────────────
const INDIAN_TECH_SEEDS = [
  'Infosys', 'Wipro', 'TCS', 'HCL Technologies', 'Tech Mahindra',
  'Flipkart', 'Swiggy', 'Zomato', 'Razorpay', 'CRED',
  'PhonePe', 'Paytm', 'Ola', 'Meesho', 'ShareChat',
  'Freshworks', 'Zoho', 'BrowserStack', 'Postman', 'Druva',
  'InMobi', 'Byju\'s', 'Unacademy', 'Vedantu', 'upGrad',
  'Nykaa', 'Mamaearth', 'Lenskart', 'Urban Company', 'Dunzo',
  'Dream11', 'MPL', 'Games24x7', 'Nazara Technologies',
  'Pine Labs', 'BharatPe', 'MobiKwik', 'Juspay', 'Setu',
  'Chargebee', 'Kissflow', 'Zenoti', 'CloudCherry', 'Eka Software',
  'Darwinbox', 'Leadsquared', 'Moengage', 'CleverTap', 'WebEngage',
  'Delhivery', 'Shiprocket', 'Shadowfax', 'Porter', 'Rivigo',
  'OYO', 'MakeMyTrip', 'Cleartrip', 'ixigo', 'EaseMyTrip',
  'Practo', 'Pristyn Care', 'Portea', 'mfine', 'Healthians',
  'Zepto', 'Blinkit', 'BigBasket', 'JioMart', 'Milkbasket',
  'Accenture India', 'Capgemini India', 'Cognizant', 'Mphasis', 'LTIMindtree',
  'Persistent Systems', 'Hexaware', 'Nisum', 'ThoughtWorks India', 'Publicis Sapient',
  'Adobe India', 'Microsoft India', 'Google India', 'Amazon India', 'Walmart Global Tech',
  'Uber India', 'LinkedIn India', 'Salesforce India', 'Oracle India', 'SAP India',
  'Goldman Sachs India', 'Morgan Stanley India', 'JPMorgan India', 'Deutsche Bank India',
  'Atlassian India', 'Nutanix India', 'Rubrik India', 'Netskope India', 'Cohesity India',
];

function PagePills({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const delta = 2;
  const pages = [];
  const left  = Math.max(0, page - delta);
  const right = Math.min(totalPages - 1, page + delta);
  if (left > 0)               pages.push({ type: 'num', n: 0 });
  if (left > 1)               pages.push({ type: 'ellipsis', key: 'l' });
  for (let i = left; i <= right; i++) pages.push({ type: 'num', n: i });
  if (right < totalPages - 2) pages.push({ type: 'ellipsis', key: 'r' });
  if (right < totalPages - 1) pages.push({ type: 'num', n: totalPages - 1 });
  return (
    <>
      {pages.map((p, i) =>
        p.type === 'ellipsis' ? (
          <span key={p.key} style={{ padding: '0 4px', color: 'var(--text-3)', fontSize: 13 }}>…</span>
        ) : (
          <button key={p.n} onClick={() => onChange(p.n)} className={`page-btn${p.n === page ? ' active' : ''}`}>{p.n + 1}</button>
        )
      )}
    </>
  );
}

// ── Benefits editor component ────────────────────────────────────────────────
function BenefitsEditor({ benefits, onChange }) {
  function addBlank() { onChange([...benefits, { name: '', amount: '' }]); }
  function addPreset(name) {
    if (benefits.some(b => b.name.toLowerCase() === name.toLowerCase())) return;
    onChange([...benefits, { name, amount: '' }]);
  }
  function update(index, field, value) {
    onChange(benefits.map((b, i) => i === index ? { ...b, [field]: value } : b));
  }
  function remove(index) { onChange(benefits.filter((_, i) => i !== index)); }
  const availablePresets = BENEFIT_PRESETS.filter(
    p => !benefits.some(b => b.name.toLowerCase() === p.toLowerCase())
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {benefits.length > 0 && (
        <div style={{ display: 'flex', gap: 8, paddingLeft: 4, paddingRight: 32 }}>
          <div style={{ flex: 1, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Benefit name</div>
          <div style={{ width: 140, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>Amount (optional)</div>
        </div>
      )}
      {benefits.map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="form-input" placeholder="e.g. Health insurance" value={b.name} onChange={e => update(i, 'name', e.target.value)} style={{ flex: 1, padding: '7px 10px', fontSize: 13 }} />
          <input className="form-input" placeholder="e.g. ₹5L/yr" value={b.amount ?? ''} onChange={e => update(i, 'amount', e.target.value)} style={{ width: 140, padding: '7px 10px', fontSize: 13, flexShrink: 0 }} />
          <button type="button" onClick={() => remove(i)} style={{ width: 28, height: 28, borderRadius: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--rose-dim)'; e.currentTarget.style.color = 'var(--rose)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}>×</button>
        </div>
      ))}
      <button type="button" onClick={addBlank} style={{ fontSize: 12, fontWeight: 500, color: '#3b82f6', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>+ Add benefit</button>
      {availablePresets.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 6 }}>Quick add</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {availablePresets.map(p => (
              <button key={p} type="button" onClick={() => addPreset(p)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>+ {p}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Import Tab ────────────────────────────────────────────────────────────────
function ImportTab({ onImportDone }) {
  const [apiKey,       setApiKey]       = useState(() => localStorage.getItem('kg_api_key') || '');
  const [apiKeySaved,  setApiKeySaved]  = useState(!!localStorage.getItem('kg_api_key'));
  const [seeds,        setSeeds]        = useState(INDIAN_TECH_SEEDS.join('\n'));
  const [fetching,     setFetching]     = useState(false);
  const [fetchProgress,setFetchProgress]= useState({ done: 0, total: 0 });
  const [results,      setResults]      = useState([]);   // { name, website, industry, description, logoUrl, selected, status }
  const [importing,    setImporting]    = useState(false);
  const [importLog,    setImportLog]    = useState([]);
  const [step,         setStep]         = useState('config'); // config | preview | done
  const abortRef = useRef(false);

  function saveApiKey() {
    localStorage.setItem('kg_api_key', apiKey.trim());
    setApiKeySaved(true);
  }

  // Fetch one company from Google Knowledge Graph
  async function fetchOne(companyName, key) {
    const url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(companyName)}&types=Corporation,Organization&limit=1&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`KG API error ${res.status}`);
    const data = await res.json();
    const item = data.itemListElement?.[0]?.result;
    if (!item) return null;

    const website = item.url ?? '';
    const domain  = website ? new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace('www.', '') : '';
    const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : '';

    return {
      name:        item.name ?? companyName,
      website:     website,
      industry:    item['@type']?.filter(t => !['Thing','Organization','Corporation'].includes(t)).join(', ') || '',
      description: item.detailedDescription?.articleBody ?? item.description ?? '',
      logoUrl,
      selected:    true,
      status:      'ready',    // ready | duplicate | imported | failed
      kgId:        item['@id'] ?? '',
    };
  }

  // Fuzzy name match: normalise both sides and check substring containment
  function normaliseName(n) { return n.toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function isFuzzyMatch(a, b) {
    const na = normaliseName(a), nb = normaliseName(b);
    if (na === nb) return true;
    if (na.includes(nb) || nb.includes(na)) return true;
    return false;
  }

  async function runFetch() {
    if (!apiKey.trim()) { alert('Please enter your Google Knowledge Graph API key first.'); return; }
    const list = seeds.split('\n').map(s => s.trim()).filter(Boolean);
    if (list.length === 0) { alert('Add at least one company name.'); return; }

    abortRef.current = false;
    setFetching(true);
    setFetchProgress({ done: 0, total: list.length });
    setResults([]);
    setStep('preview');

    // Pre-load all existing company names from DB for fuzzy duplicate detection
    let existingNames = [];
    try {
      const res = await api.get('/admin/companies', { params: { size: 1000 } });
      existingNames = (res.data?.data?.content ?? []).map(c => c.name);
    } catch (_) { /* non-fatal */ }

    const out = [];
    for (let i = 0; i < list.length; i++) {
      if (abortRef.current) break;
      try {
        const r = await fetchOne(list[i], apiKey.trim());
        if (r) {
          const fuzzyMatch = existingNames.find(en => isFuzzyMatch(en, r.name));
          if (fuzzyMatch) {
            out.push({ ...r, selected: false, status: 'likely_duplicate', matchedWith: fuzzyMatch });
          } else {
            out.push(r);
          }
        } else {
          out.push({ name: list[i], website: '', industry: '', description: '', logoUrl: '', selected: false, status: 'not_found' });
        }
      } catch (e) {
        out.push({ name: list[i], website: '', industry: '', description: '', logoUrl: '', selected: false, status: 'error', errorMsg: e.message });
      }
      setResults([...out]);
      setFetchProgress({ done: i + 1, total: list.length });
      await new Promise(r => setTimeout(r, 120));
    }
    setFetching(false);
  }

  function stopFetch() { abortRef.current = true; }

  function toggleSelect(i) {
    setResults(prev => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r));
  }
  function selectAll()   { setResults(prev => prev.map(r => (r.status === 'ready' || r.status === 'likely_duplicate') ? { ...r, selected: true } : r)); }
  function deselectAll() { setResults(prev => prev.map(r => ({ ...r, selected: false }))); }

  async function runImport() {
    const toImport = results.filter(r => r.selected && (r.status === 'ready' || r.status === 'likely_duplicate'));
    if (toImport.length === 0) { alert('No companies selected.'); return; }
    setImporting(true);
    setImportLog([]);
    const log = [];

    for (const r of toImport) {
      try {
        // Always call /upsert — backend creates if new, patches blank fields if exists, skips if already complete
        const resp = await api.post('/admin/companies/upsert', {
          name:     r.name,
          website:  r.website  || null,
          industry: r.industry || null,
          logoUrl:  r.logoUrl  || null,
          benefits: [],
        });
        const action = resp.data?.data?.action ?? 'CREATED';
        const statusMap = { CREATED: 'imported', PATCHED: 'patched', SKIPPED: 'skipped' };
        log.push({ name: r.name, ok: true, action });
        setResults(prev => prev.map(x => x.name === r.name ? { ...x, status: statusMap[action] ?? 'imported' } : x));
      } catch (e) {
        const msg = e.response?.data?.message ?? e.message;
        log.push({ name: r.name, ok: false, msg });
        setResults(prev => prev.map(x => x.name === r.name ? { ...x, status: 'failed' } : x));
      }
      setImportLog([...log]);
      await new Promise(r => setTimeout(r, 60));
    }

    setImporting(false);
    setStep('done');
    onImportDone?.();
  }

  const readyCount         = results.filter(r => r.status === 'ready').length;
  const likelyDupCount     = results.filter(r => r.status === 'likely_duplicate').length;
  const selectedCount      = results.filter(r => r.selected && (r.status === 'ready' || r.status === 'likely_duplicate')).length;
  const importedCount      = results.filter(r => r.status === 'imported').length;
  const patchedCount       = results.filter(r => r.status === 'patched').length;
  const skippedCount       = results.filter(r => r.status === 'skipped').length;
  const failedCount        = results.filter(r => r.status === 'failed').length;
  const notFoundCount      = results.filter(r => r.status === 'not_found').length;

  return (
    <div style={{ maxWidth: 900 }}>

      {/* ── Step 1: Config ── */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: step === 'config' ? '#3b82f6' : '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {step === 'config' ? '1' : '✓'}
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Google Knowledge Graph API Key</span>
          <a href="https://developers.google.com/knowledge-graph/how-tos/authorizing" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#3b82f6', marginLeft: 'auto', textDecoration: 'none' }}>How to get a free key ↗</a>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            className="form-input"
            type="password"
            placeholder="AIza…"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setApiKeySaved(false); }}
            style={{ flex: 1, padding: '8px 12px', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}
          />
          <button
            onClick={saveApiKey}
            disabled={!apiKey.trim() || apiKeySaved}
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: apiKeySaved ? 'default' : 'pointer', background: apiKeySaved ? '#22c55e' : '#3b82f6', color: '#fff', border: 'none', flexShrink: 0, transition: 'background 0.15s' }}
          >
            {apiKeySaved ? '✓ Saved' : 'Save Key'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
          Free tier: 100,000 calls/day. Key is stored in your browser only, never sent to our server. Logos fetched via Clearbit (free, no key needed).
        </div>
      </div>

      {/* ── Company seed list ── */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>2</div>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Company List</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>{seeds.split('\n').filter(Boolean).length} companies</span>
          <button onClick={() => setSeeds(INDIAN_TECH_SEEDS.join('\n'))} style={{ marginLeft: 'auto', fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Reset to defaults</button>
        </div>
        <textarea
          value={seeds}
          onChange={e => setSeeds(e.target.value)}
          rows={8}
          style={{ width: '100%', padding: '10px 12px', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
          placeholder="One company name per line…"
        />
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>One company name per line. Edit freely — add, remove, or paste your own list.</div>
      </div>

      {/* ── Fetch button ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
        {!fetching ? (
          <button
            onClick={runFetch}
            disabled={!apiKey.trim()}
            style={{ padding: '11px 28px', fontSize: 14, fontWeight: 600, borderRadius: 10, background: apiKey.trim() ? '#3b82f6' : 'var(--bg-3)', color: apiKey.trim() ? '#fff' : 'var(--text-3)', border: 'none', cursor: apiKey.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
          >
            {results.length > 0 ? '↺ Re-fetch Companies' : '⬇ Fetch Companies from Google'}
          </button>
        ) : (
          <>
            <div style={{ flex: 1, maxWidth: 360 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Fetching company data…</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'IBM Plex Mono', monospace" }}>{fetchProgress.done} / {fetchProgress.total}</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(fetchProgress.done / fetchProgress.total) * 100}%`, background: 'linear-gradient(90deg, #38bdf8, #3b82f6)', borderRadius: 99, transition: 'width 0.3s' }} />
              </div>
            </div>
            <button onClick={stopFetch} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 8, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.3)', cursor: 'pointer' }}>Stop</button>
          </>
        )}
      </div>

      {/* ── Preview results table ── */}
      {results.length > 0 && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
          {/* Table header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Preview — {results.length} companies</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {readyCount > 0      && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontWeight: 500 }}>{readyCount} ready</span>}
              {likelyDupCount > 0  && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(251,191,36,0.15)', color: '#d97706', fontWeight: 500 }}>{likelyDupCount} likely duplicate</span>}
              {importedCount > 0   && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontWeight: 500 }}>{importedCount} imported</span>}
              {patchedCount > 0    && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', color: '#6366f1', fontWeight: 500 }}>{patchedCount} patched</span>}
              {skippedCount > 0    && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-3)', color: 'var(--text-3)', fontWeight: 500 }}>{skippedCount} skipped</span>}
              {failedCount > 0     && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--rose-dim)', color: 'var(--rose)', fontWeight: 500 }}>{failedCount} failed</span>}
              {notFoundCount > 0   && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-3)', color: 'var(--text-3)', fontWeight: 500 }}>{notFoundCount} not found</span>}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={selectAll}   style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer' }}>Select all</button>
              <button onClick={deselectAll} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer' }}>Deselect all</button>
            </div>
          </div>

          {/* Scrollable results */}
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-2)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 36 }}></th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 80 }}>Logo</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const isReady = r.status === 'ready';
                  const rowBg = r.status === 'imported' ? 'rgba(34,197,94,0.04)'
                              : r.status === 'duplicate' ? 'rgba(251,191,36,0.05)'
                              : r.status === 'failed' ? 'rgba(224,92,122,0.05)'
                              : r.status === 'not_found' ? 'var(--bg-2)'
                              : 'transparent';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: rowBg, opacity: r.status === 'not_found' ? 0.55 : 1 }}>
                      <td style={{ padding: '10px 16px' }}>
                        <input
                          type="checkbox"
                          checked={r.selected}
                          disabled={!isReady}
                          onChange={() => toggleSelect(i)}
                          style={{ accentColor: '#3b82f6', cursor: isReady ? 'pointer' : 'default', width: 14, height: 14 }}
                        />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.name}</div>
                        {r.description && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, lineClamp: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 340 }}>{r.description.slice(0, 100)}{r.description.length > 100 ? '…' : ''}</div>}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-3)' }}>
                        {r.website
                          ? <a href={r.website} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>{r.website.replace(/^https?:\/\//, '')}</a>
                          : <span style={{ fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {r.logoUrl
                          ? <img src={r.logoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)', background: '#fff', padding: 3 }} onError={e => { e.target.style.display = 'none'; }} />
                          : <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {r.status === 'ready'           && <span style={{ fontSize: 11, fontWeight: 500, color: '#3b82f6' }}>● Ready</span>}
                        {r.status === 'likely_duplicate' && <span style={{ fontSize: 11, fontWeight: 500, color: '#d97706' }} title={`Fuzzy match: "${r.matchedWith}"`}>⚠ Likely duplicate</span>}
                        {r.status === 'imported'        && <span style={{ fontSize: 11, fontWeight: 500, color: '#22c55e' }}>✓ Created</span>}
                        {r.status === 'patched'         && <span style={{ fontSize: 11, fontWeight: 500, color: '#6366f1' }}>↑ Patched</span>}
                        {r.status === 'skipped'         && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>— Skipped</span>}
                        {r.status === 'failed'          && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--rose)' }} title={r.errorMsg}>✕ Failed</span>}
                        {r.status === 'not_found'       && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Not found</span>}
                        {r.status === 'error'           && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--rose)' }} title={r.errorMsg}>Error</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Import footer */}
          {(readyCount > 0 || likelyDupCount > 0) && step !== 'done' && (
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text-1)' }}>{selectedCount}</strong> selected
                {likelyDupCount > 0 && <span style={{ marginLeft: 6, fontSize: 12, color: '#d97706' }}>({likelyDupCount} likely duplicates — will patch blank fields only)</span>}
              </span>
              <button
                onClick={runImport}
                disabled={importing || selectedCount === 0}
                style={{ marginLeft: 'auto', padding: '9px 24px', fontSize: 13, fontWeight: 600, borderRadius: 9, background: selectedCount > 0 ? '#22c55e' : 'var(--bg-3)', color: selectedCount > 0 ? '#fff' : 'var(--text-3)', border: 'none', cursor: selectedCount > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
              >
                {importing ? `Importing… (${importLog.length}/${selectedCount})` : `⬆ Import ${selectedCount} Companies`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Import summary ── */}
      {step === 'done' && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginBottom: 10 }}>✓ Import complete</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {importedCount > 0 && <div style={{ fontSize: 13 }}><span style={{ color: '#22c55e', fontWeight: 600 }}>{importedCount}</span> <span style={{ color: 'var(--text-2)' }}>created</span></div>}
            {patchedCount > 0  && <div style={{ fontSize: 13 }}><span style={{ color: '#6366f1', fontWeight: 600 }}>{patchedCount}</span> <span style={{ color: 'var(--text-2)' }}>patched (blank fields filled)</span></div>}
            {skippedCount > 0  && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{skippedCount}</span> <span style={{ color: 'var(--text-2)' }}>skipped (already complete)</span></div>}
            {failedCount > 0   && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--rose)', fontWeight: 600 }}>{failedCount}</span> <span style={{ color: 'var(--text-2)' }}>failed</span></div>}
          </div>
          <button onClick={() => { setStep('config'); setResults([]); setImportLog([]); }} style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            Start a new import
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminCompanies() {
  const [activeTab,  setActiveTab]  = useState('list'); // list | import
  const [companies,  setCompanies]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [search,     setSearch]     = useState('');
  const debounceRef  = useRef(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const load = useCallback(() => {
    setLoading(true); setLoadError(null); TopProgressBar.start();
    const params = { page, size };
    if (search) params.name = search;
    api.get('/admin/companies', { params })
      .then(r => {
        const d = r.data?.data;
        setCompanies(d?.content ?? []);
        setTotal(d?.totalElements ?? 0);
        setTotalPages(d?.totalPages ?? 0);
        setLoadError(null);
      })
      .catch(err => setLoadError(`${err.response?.status ?? 'Network error'}: ${err.response?.data?.message ?? err.message}`))
      .finally(() => { setLoading(false); TopProgressBar.done(); });
  }, [page, size, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function commitSearch(val) { clearTimeout(debounceRef.current); setSearch(val); setPage(0); }
  function handleSearchChange(e) {
    const val = e.target.value;
    setInputValue(val);
    clearTimeout(debounceRef.current);
    if (val.length === 0) { commitSearch(''); return; }
    if (val.length < SEARCH_MIN) return;
    debounceRef.current = setTimeout(() => commitSearch(val), SEARCH_WAIT);
  }
  function handleSearchKey(e) { if (e.key === 'Enter' && inputValue.length >= SEARCH_MIN) commitSearch(inputValue); }
  function clearSearch() { setInputValue(''); commitSearch(''); }
  function handleSizeChange(newSize) { setSize(newSize); setPage(0); }

  function normalizeBenefits(raw) {
    if (!raw || raw.length === 0) return [];
    return raw.map(b => typeof b === 'string' ? { name: b, amount: '' } : { name: b.name ?? '', amount: b.amount ?? '' });
  }

  function openCreate() { setForm(EMPTY); setModal('create'); setError(''); }
  function openEdit(c) {
    setForm({ name: c.name, industry: c.industry ?? '', website: c.website ?? '', description: c.description ?? '', benefits: normalizeBenefits(c.benefits) });
    setModal(c); setError('');
  }

  async function save() {
    setSaving(true); setError(''); TopProgressBar.start();
    try {
      const cleanBenefits = (form.benefits ?? []).filter(b => b.name.trim() !== '').map(b => ({ name: b.name.trim(), amount: b.amount?.trim() || null }));
      const payload = { ...form, benefits: cleanBenefits };
      if (modal === 'create') await api.post('/admin/companies', payload);
      else                    await api.put(`/admin/companies/${modal.id}`, payload);
      setModal(null); load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false); TopProgressBar.done();
    }
  }

  async function toggleStatus(c) { TopProgressBar.start(); await api.patch(`/admin/companies/${c.id}/toggle-status`); TopProgressBar.done(); load(); }
  async function del(id) { if (!window.confirm('Delete this company?')) return; TopProgressBar.start(); await api.delete(`/admin/companies/${id}`); TopProgressBar.done(); load(); }

  const start = page * size + 1;
  const end   = Math.min((page + 1) * size, total);
  const showingHint = inputValue.length > 0 && inputValue.length < SEARCH_MIN
    ? `Type ${SEARCH_MIN - inputValue.length} more character${SEARCH_MIN - inputValue.length !== 1 ? 's' : ''} to search`
    : null;
  const showEnterHint = inputValue.length >= SEARCH_MIN && inputValue !== search;

  return (
    <div className="admin-page-content">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <span className="section-tag">Admin</span>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', marginTop: 4, letterSpacing: '-0.02em' }}>Companies</h2>
        </div>
        {activeTab === 'list' && (
          <button className="btn-primary" style={{ padding: '10px 22px' }} onClick={openCreate}>+ Add Company</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {[
          { id: 'list',   label: `Companies${total > 0 ? ` (${total})` : ''}` },
          { id: 'import', label: '⬇ Import from Google' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '9px 18px', fontSize: 13, fontWeight: 600, border: 'none',
              background: 'none', cursor: 'pointer', borderBottom: `2px solid ${activeTab === t.id ? '#3b82f6' : 'transparent'}`,
              color: activeTab === t.id ? '#3b82f6' : 'var(--text-3)',
              marginBottom: -1, transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── List Tab ── */}
      {activeTab === 'list' && (
        <>
          <div className="filter-bar" style={{ marginBottom: 20 }}>
            <div className="search-box" style={{ position: 'relative', flex: 1, minWidth: 240 }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input className="input-field" value={inputValue} onChange={handleSearchChange} onKeyDown={handleSearchKey} placeholder="Search companies… (3+ chars)" autoComplete="off" />
              {showEnterHint && (
                <span onClick={() => commitSearch(inputValue)} style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#3b82f6', cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace", whiteSpace: 'nowrap', padding: '2px 7px', background: 'rgba(59,130,246,0.1)', borderRadius: 5 }}>↵ Search</span>
              )}
              {inputValue && <span onClick={clearSearch} style={{ flexShrink: 0, cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Rows:</span>
              {SIZE_OPTIONS.map(s => (
                <button key={s} onClick={() => handleSizeChange(s)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: size === s ? '#3b82f6' : 'var(--bg-2)', color: size === s ? '#fff' : 'var(--text-3)', border: size === s ? '1px solid #3b82f6' : '1px solid var(--border)', transition: 'all 0.12s' }}>{s}</button>
              ))}
            </div>
          </div>

          {showingHint && <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, marginLeft: 2, fontFamily: "'IBM Plex Mono',monospace" }}>{showingHint}</div>}

          {loadError && (
            <div style={{ padding: '14px 18px', background: 'var(--rose-dim)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 12, color: 'var(--rose)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>⚠</span><span>{loadError}</span>
              <button onClick={load} style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 12, fontWeight: 600, background: 'rgba(224,92,122,0.15)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.3)', borderRadius: 6, cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          {!loadError && (
            loading ? (
              <div style={{ padding: '32px 0 30px' }}>
                <div style={{ width: '100%', height: 3, background: 'var(--bg-3)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius: 99, animation: 'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
                </div>
                <style>{`@keyframes progressCrawl{0%{width:0%}40%{width:65%}70%{width:82%}100%{width:90%}}`}</style>
              </div>
            ) : (
              <>
                <div className="salary-table-wrap">
                  <table className="salary-table">
                    <thead>
                      <tr>
                        <th>Company</th><th>Industry</th><th>Website</th><th>Benefits</th><th>Status</th><th style={{ width: 180 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontStyle: 'italic' }}>{search ? `No companies match "${search}"` : 'No companies yet.'}</td></tr>
                      ) : companies.map(c => (
                        <tr key={c.id}>
                          <td><div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{c.name}</div></td>
                          <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{c.industry ?? '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {c.website ? <a href={c.website} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>{c.website.replace(/^https?:\/\//, '')}</a> : '—'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {c.benefits && c.benefits.length > 0 ? `${c.benefits.length} benefit${c.benefits.length !== 1 ? 's' : ''}` : <span style={{ fontStyle: 'italic' }}>None</span>}
                          </td>
                          <td><span className={`status-badge ${c.status === 'ACTIVE' ? 'status-approved' : 'status-rejected'}`}>{c.status === 'ACTIVE' ? '● Active' : '● Inactive'}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="view-btn" onClick={() => openEdit(c)}>Edit</button>
                              <button onClick={() => toggleStatus(c)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'var(--ink-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}>{c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
                              <button onClick={() => del(c.id)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(224,92,122,0.2)', borderRadius: 6, cursor: 'pointer' }}>Del</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {total > 0 && (
                  <div className="pagination">
                    <span className="page-info">
                      {total === 0 ? 'No results' : `Showing ${start}–${end} of ${total} compan${total !== 1 ? 'ies' : 'y'}`}
                      {search && <span style={{ marginLeft: 6, color: '#3b82f6', fontWeight: 500 }}>for "{search}"</span>}
                    </span>
                    <div className="page-btns">
                      <button className="page-btn" disabled={page === 0} onClick={() => setPage(0)} title="First">«</button>
                      <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)} title="Previous">‹</button>
                      <PagePills page={page} totalPages={totalPages} onChange={setPage} />
                      <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} title="Next">›</button>
                      <button className="page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} title="Last">»</button>
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </>
      )}

      {/* ── Import Tab ── */}
      {activeTab === 'import' && (
        <ImportTab onImportDone={load} />
      )}

      {/* ── Create / Edit Modal ── */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModal(null)}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 20, width: 560, maxWidth: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, color: 'var(--text-1)' }}>
                {modal === 'create' ? 'Add Company' : `Edit — ${modal.name}`}
              </h3>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 32px' }}>
              {error && <div style={{ padding: '10px 14px', background: 'var(--rose-dim)', color: 'var(--rose)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                <div className="form-group">
                  <label className="form-label">Benefits</label>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
                    Source from the company's official benefits page. Amount is optional (e.g. "₹5L/yr", "Varies", "26 weeks").
                  </div>
                  <BenefitsEditor benefits={form.benefits ?? []} onChange={benefits => setForm(x => ({ ...x, benefits }))} />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';
import { useAppData } from '../../context/AppDataContext';

const VIZ_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#6366f1','#a78bfa','#818cf8'];
const SEARCH_MIN_CHARS = 3;
const SEARCH_DEBOUNCE  = 600;
const PAGE_SIZE        = 10;
const BENEFITS_PREVIEW = 3;

function fmtSalary(val) {
  if (!val && val !== 0) return '—';
  const l = Number(val) / 100000;
  return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const h     = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  const months= Math.floor(diff / 2592000000);
  if (h < 1)    return 'just now';
  if (h < 24)   return `${h}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4)return `${weeks}w ago`;
  return `${months}mo ago`;
}

function mapSalary(s) {
  const fmt = (v) => { if (!v && v !== 0) return '—'; const l = Number(v)/100000; return l>=100?`₹${(l/100).toFixed(1)}Cr`:`₹${l.toFixed(1)}L`; };
  return {
    id: s.id, role: s.jobTitle ?? '—',
    internalLevel: s.standardizedLevelName ?? '—',
    location: s.location ?? '—',
    base: fmt(s.baseSalary), bonus: fmt(s.bonus),
    equity: fmt(s.equity), tc: fmt(s.totalCompensation),
    yoe: s.yearsOfExperience != null ? `${s.yearsOfExperience} yr` : '—',
    recordedAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—',
  };
}

// ── Benefits helpers ─────────────────────────────────────────────────────────

const BENEFIT_ICON_MAP = {
  // Financial
  'esop': '💰', 'stock': '💰', 'equity': '💰',
  'meal': '🍱', 'food': '🍱', 'lunch': '🍱',
  'relocation': '📦', 'moving': '📦',
  'bonus': '💵', 'incentive': '💵',
  // Health
  'health': '🏥', 'medical': '🏥', 'hospitalization': '🏥',
  'dental': '🦷', 'vision': '👁️', 'optical': '👁️',
  'gym': '💪', 'wellness': '💪', 'fitness': '💪',
  'mental': '🧠',
  // Growth
  'learning': '📚', 'education': '📚', 'course': '📚', 'conference': '📚', 'training': '📚',
  'certification': '🎓',
  // Lifestyle
  'wfh': '🏠', 'remote': '🏠', 'work from home': '🏠',
  'parental': '👶', 'maternity': '👶', 'paternity': '👶',
  'leave': '🌴', 'sabbatical': '🌴', 'pto': '🌴',
  'commute': '🚌', 'transport': '🚌',
};

const BENEFIT_CATEGORY_MAP = {
  financial: ['esop', 'stock', 'equity', 'meal', 'food', 'lunch', 'relocation', 'moving', 'bonus', 'incentive', 'allowance'],
  health:    ['health', 'medical', 'hospitalization', 'dental', 'vision', 'optical', 'gym', 'wellness', 'fitness', 'mental'],
  growth:    ['learning', 'education', 'course', 'conference', 'training', 'certification', 'budget'],
  lifestyle: ['wfh', 'remote', 'work from home', 'parental', 'maternity', 'paternity', 'leave', 'sabbatical', 'pto', 'commute', 'transport'],
};

const CATEGORY_META = {
  financial: { label: 'Financial', dot: '#639922', iconBg: 'rgba(99,153,34,0.12)'  },
  health:    { label: 'Health',    dot: '#E24B4A', iconBg: 'rgba(226,75,74,0.1)'   },
  growth:    { label: 'Growth',    dot: '#378ADD', iconBg: 'rgba(55,138,221,0.1)'  },
  lifestyle: { label: 'Lifestyle', dot: '#BA7517', iconBg: 'rgba(186,117,23,0.1)'  },
  other:     { label: 'Other',     dot: '#888780', iconBg: 'rgba(136,135,128,0.1)' },
};

function detectCategory(name) {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(BENEFIT_CATEGORY_MAP)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'other';
}

function detectIcon(name) {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(BENEFIT_ICON_MAP)) {
    if (lower.includes(keyword)) return icon;
  }
  return '✦';
}

// SVG icon components for benefits — correct semantic icons per category
const BENEFIT_SVG_ICONS = {
  financial: {
    esop:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    meal:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>,
    relocation:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    bonus:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    allowance:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
  health: {
    health:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    dental:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 0 0-5 5c0 2 1 3.5 1 5s-.5 4-1 6h10c-.5-2-1-4.5-1-6s1-3 1-5a5 5 0 0 0-5-5z"/></svg>,
    gym:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 9.5v5"/><path d="M21 9.5v5"/><path d="M3 12h18"/><rect x="1" y="9" width="4" height="6" rx="1"/><rect x="19" y="9" width="4" height="6" rx="1"/></svg>,
    mental:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></svg>,
    vision:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  },
  growth: {
    learning:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    certification:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
    conference:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    budget:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  lifestyle: {
    remote:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    parental:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 3 6 3 10c0 3.5 2.5 6.5 6 7.5V21h6v-3.5c3.5-1 6-4 6-7.5 0-4-3.48-8-9-8z"/></svg>,
    leave:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    commute:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  },
  default:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

function getBenefitSvgIcon(name = '', cat = 'other') {
  const lower = name.toLowerCase();
  const catIcons = BENEFIT_SVG_ICONS[cat] ?? {};
  for (const [key, icon] of Object.entries(catIcons)) {
    if (lower.includes(key)) return icon;
  }
  // fallback: check all categories
  for (const icons of Object.values(BENEFIT_SVG_ICONS)) {
    if (!icons.viewBox) { // skip the default svg node
      for (const [key, icon] of Object.entries(icons)) {
        if (lower.includes(key)) return icon;
      }
    }
  }
  return BENEFIT_SVG_ICONS.default;
}

function getValueStyle(amount) {
  if (!amount) return { color: 'var(--text-3)', fontStyle: 'italic', fontWeight: 400, fontSize: 12 };
  const lower = String(amount).toLowerCase();
  if (lower === 'offered' || lower === 'covered' || lower === 'free') return { color: '#16a34a', fontWeight: 700, fontSize: 13 };
  if (lower === 'no') return { color: '#dc2626', fontWeight: 700, fontSize: 13 };
  return { color: 'var(--text-1)', fontWeight: 700, fontSize: 13, fontFamily: "'IBM Plex Mono',monospace" };
}

function BenefitsGrid({ benefits }) {
  const [activeTab, setActiveTab] = React.useState(null);

  if (!benefits || benefits.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:13, fontStyle:'italic' }}>
        No benefits information added yet.
      </div>
    );
  }

  const normalised = benefits.map(b => ({
    name:   typeof b === 'string' ? b : b.name,
    amount: typeof b === 'string' ? null : (b.amount ?? b.value ?? null),
  }));

  const groups = {};
  normalised.forEach(b => {
    const cat = detectCategory(b.name);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(b);
  });

  const ORDER = ['financial', 'health', 'growth', 'lifestyle', 'other'];
  const availableCats = ORDER.filter(cat => groups[cat]);

  // Default to first available category
  const currentTab = activeTab && groups[activeTab] ? activeTab : availableCats[0];

  const TAB_ICONS = {
    financial: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    health:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    growth:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    lifestyle: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    other:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  };

  const currentMeta  = CATEGORY_META[currentTab];
  const currentItems = groups[currentTab] ?? [];

  return (
    <>
      <style>{`
        .ben-tab { transition: all 0.15s; border: 1.5px solid transparent; cursor: pointer; }
        .ben-tab:hover { border-color: var(--border) !important; }
        .ben-card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 18px 16px 14px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
          cursor: default;
        }
        .ben-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.10);
          border-color: var(--border);
        }
        .ben-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 768px) {
          .ben-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Category tabs */}
      <div className="ben-tabs-row" style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {availableCats.map(cat => {
          const meta    = CATEGORY_META[cat];
          const isActive = cat === currentTab;
          const count   = groups[cat].length;
          return (
            <button
              key={cat}
              className="ben-tab"
              onClick={() => setActiveTab(cat)}
              style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'7px 14px', borderRadius:10,
                background: isActive ? meta.dot : 'var(--bg-2)',
                color: isActive ? '#fff' : 'var(--text-2)',
                border: isActive ? `1.5px solid ${meta.dot}` : '1.5px solid var(--border)',
                fontSize:12, fontWeight: isActive ? 600 : 400,
              }}
            >
              <span style={{ color: isActive ? 'rgba(255,255,255,0.85)' : meta.dot }}>
                {TAB_ICONS[cat]}
              </span>
              {meta.label}
              <span style={{
                fontSize:10, fontWeight:600,
                background: isActive ? 'rgba(255,255,255,0.2)' : meta.iconBg,
                color: isActive ? '#fff' : meta.dot,
                padding:'1px 6px', borderRadius:20, minWidth:18, textAlign:'center',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards for active category */}
      <div className="ben-grid">
        {currentItems.map((b, i) => {
          const amount = b.amount;
          const lower  = String(amount ?? '').toLowerCase();
          const isGood = lower === 'offered' || lower === 'covered' || lower === 'free' || lower === 'yes';
          const isNo   = lower === 'no';
          const hasMoney = amount && !isGood && !isNo;

          return (
            <div key={i} className="ben-card">
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: currentMeta.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: currentMeta.dot,
              }}>
                <div style={{ width: 22, height: 22 }}>
                  {getBenefitSvgIcon(b.name, currentTab)}
                </div>
              </div>

              {/* Name */}
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text-1)', lineHeight:1.3 }}>
                {b.name}
              </div>

              {/* Value badge */}
              {amount ? (
                <span style={{
                  display:'inline-flex', alignItems:'center',
                  fontSize:11, fontWeight:600,
                  padding:'3px 9px', borderRadius:20,
                  background: isGood ? 'rgba(22,163,74,0.1)' : isNo ? 'rgba(220,38,38,0.08)' : currentMeta.iconBg,
                  color: isGood ? '#16a34a' : isNo ? '#dc2626' : currentMeta.dot,
                  fontFamily: hasMoney ? "'IBM Plex Mono',monospace" : 'inherit',
                }}>
                  {isGood ? '✓ ' : isNo ? '✗ ' : hasMoney ? '₹' : ''}{amount}
                </span>
              ) : (
                <span style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>not specified</span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Company Detail Modal ──────────────────────────────────────────────────────
function CompanyModal({ company, initialTab = 'levels', onClose }) {
  const [tab,           setTab]          = useState(initialTab);
  const [salaries,      setSalaries]     = useState([]);
  const [levels,        setLevels]       = useState(null);
  const [loadingEnt,    setLoadingEnt]   = useState(false);
  const [loadingLvl,    setLoadingLvl]   = useState(true);
  const [page,          setPage]         = useState(0);
  const [totalPages,    setTotalPages]   = useState(1);
  const [totalElements, setTotalElements]= useState(0);
  // Server-side filter + sort state
  const [filterFunctionId,  setFilterFunctionId]  = useState('');
  const [filterLevelId,     setFilterLevelId]     = useState('');
  const [filterLocations,   setFilterLocations]   = useState([]);
  const [locationPopover,   setLocationPopover]   = useState(false);
  const locationPopRef = useRef(null);
  const [sortBy,         setSortBy]         = useState('totalCompensation');

  // Function + Level options from app context
  const { functions, getLevelsForFunction } = useAppData();
  const functionOptions = [{ value: '', label: 'All Functions' }, ...functions.map(f => ({ value: String(f.id), label: f.displayName || f.name }))];
  const levelOptions    = [{ value: '', label: 'All Levels'    }, ...(filterFunctionId ? getLevelsForFunction(filterFunctionId).map(l => ({ value: String(l.id), label: l.name })) : [])];

  const LOCATION_OPTIONS = [
    { value:'BENGALURU', label:'Bengaluru' },
    { value:'HYDERABAD', label:'Hyderabad' },
    { value:'PUNE',      label:'Pune'      },
    { value:'DELHI_NCR', label:'Delhi NCR' },
    { value:'MUMBAI',    label:'Mumbai'    },
    { value:'CHENNAI',   label:'Chennai'   },
    { value:'KOLKATA',   label:'Kolkata'   },
    { value:'REMOTE',    label:'Remote'    },
  ];

  // Close location popover on outside click
  useEffect(() => {
    if (!locationPopover) return;
    const handler = (e) => { if (!locationPopRef.current?.contains(e.target)) setLocationPopover(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [locationPopover]);

  // ── Function breakdown state ───────────────────────────────────────────────
  const PINNED_FUNCTIONS = ['Engineering', 'Product', 'Design'];
  const [selectedFn,    setSelectedFn]    = useState(null);
  const [popoverOpen,   setPopoverOpen]   = useState(false);
  const [popoverSearch, setPopoverSearch] = useState('');

  // Derive ordered function list — sorted by total entry count desc
  const fnMap = {};
  (levels ?? []).forEach(l => {
    const fn = l.functionName ?? 'Other';
    if (!fnMap[fn]) fnMap[fn] = { name: fn, count: 0 };
    fnMap[fn].count += Number(l.count ?? 0);
  });
  const allFunctions = Object.values(fnMap).sort((a, b) => b.count - a.count);

  // Always include Engineering, Product, Design — even if count is 0
  const pinnedFnsWithData = PINNED_FUNCTIONS.map(name => fnMap[name] ?? { name, count: 0 });
  const nonPinnedFns = allFunctions.filter(fn => !PINNED_FUNCTIONS.includes(fn.name));
  // top3 = always the 3 pinned; moreFns = everything else
  const top3Fns  = pinnedFnsWithData;
  const moreFns  = nonPinnedFns;

  const FN_PALETTE = [
    { bg:'#E6F1FB', color:'#185FA5', bar:'#185FA5' },
    { bg:'#EEEDFE', color:'#534AB7', bar:'#534AB7' },
    { bg:'#E1F5EE', color:'#0F6E56', bar:'#0F6E56' },
    { bg:'#FAEEDA', color:'#854F0B', bar:'#854F0B' },
    { bg:'#EAF3DE', color:'#3B6D11', bar:'#3B6D11' },
    { bg:'#FCEBEB', color:'#A32D2D', bar:'#A32D2D' },
  ];
  const fnPaletteMap = {};
  allFunctions.forEach((fn, i) => { fnPaletteMap[fn.name] = FN_PALETTE[i % FN_PALETTE.length]; });

  const activeFnLevels = selectedFn
    ? (levels ?? []).filter(l => (l.functionName ?? 'Other') === selectedFn)
    : [];
  const maxActivTC = activeFnLevels.length > 0
    ? Math.max(...activeFnLevels.map(l => l.avgTC ?? 0), 1)
    : 1;
  const filteredMoreFns = moreFns.filter(f =>
    f.name.toLowerCase().includes(popoverSearch.toLowerCase())
  );

  // Badge colour per internal level
  const LEVEL_BADGE = {
    SDE_1:                { bg:'#E1F5EE', color:'#0F6E56', darkBg:'#085041', darkColor:'#9FE1CB' },
    SDE_2:                { bg:'#E6F1FB', color:'#185FA5', darkBg:'#0C447C', darkColor:'#B5D4F4' },
    SDE_3:                { bg:'#EEEDFE', color:'#534AB7', darkBg:'#3C3489', darkColor:'#CECBF6' },
    STAFF_ENGINEER:       { bg:'#EEEDFE', color:'#534AB7', darkBg:'#3C3489', darkColor:'#CECBF6' },
    PRINCIPAL_ENGINEER:   { bg:'#FAEEDA', color:'#854F0B', darkBg:'#633806', darkColor:'#FAC775' },
    ARCHITECT:            { bg:'#FAEEDA', color:'#854F0B', darkBg:'#633806', darkColor:'#FAC775' },
    ENGINEERING_MANAGER:  { bg:'#FCEBEB', color:'#A32D2D', darkBg:'#791F1F', darkColor:'#F7C1C1' },
    SR_ENGINEERING_MANAGER:{ bg:'#FCEBEB', color:'#A32D2D', darkBg:'#791F1F', darkColor:'#F7C1C1' },
    DIRECTOR:             { bg:'#FCEBEB', color:'#A32D2D', darkBg:'#791F1F', darkColor:'#F7C1C1' },
    SR_DIRECTOR:          { bg:'#FCEBEB', color:'#A32D2D', darkBg:'#791F1F', darkColor:'#F7C1C1' },
    VP:                   { bg:'#F1EFE8', color:'#5F5E5A', darkBg:'#444441', darkColor:'#D3D1C7' },
  };

  function getLevelBadgeStyle(internalLevelStr) {
    const key = internalLevelStr?.replace(/ /g,'_').toUpperCase();
    const b = LEVEL_BADGE[key];
    if (!b) return { fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:99, background:'var(--bg-2)', color:'var(--text-2)', whiteSpace:'nowrap' };
    return { fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:99, background:b.bg, color:b.color, whiteSpace:'nowrap' };
  }

  const LEVEL_COLORS = { junior:'#06b6d4', mid:'#6366f1', senior:'#3b82f6', lead:'#8b5cf6' };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.fn-more-popover-wrap')) setPopoverOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverOpen]);

  // Load level breakdown on mount
  useEffect(() => {
    setLoadingLvl(true);
    api.get(`/public/companies/${company.id}/salary-summary`)
      .then(r => {
        const lvls = r.data?.data?.levels ?? [];
        setLevels(lvls);
        // Auto-select Engineering by default; fall back to the top function if no Engineering data
        const hasEngineering = lvls.some(l => (l.functionName ?? 'Other') === 'Engineering');
        const topFn = lvls.reduce((top, l) => {
          const fn = l.functionName ?? 'Other';
          if (!top[fn]) top[fn] = 0;
          top[fn] += Number(l.count ?? 0);
          return top;
        }, {});
        const topFnName = Object.entries(topFn).sort((a, b) => b[1] - a[1])[0]?.[0];
        setSelectedFn(hasEngineering ? 'Engineering' : (topFnName ?? null));
      })
      .catch(() => setLevels([]))
      .finally(() => setLoadingLvl(false));
  }, [company.id]);

  // Load salary entries — re-fetches on filter/sort/page change
  useEffect(() => {
    if (tab !== 'entries') return;
    setLoadingEnt(true);
    const params = { page, size: 10, sortBy };
    if (filterFunctionId) params.jobFunctionId    = filterFunctionId;
    if (filterLevelId)    params.functionLevelId  = filterLevelId;
    if (filterLocations.length > 0) params.location = filterLocations.join(',');
    api.get(`/public/companies/${company.id}/salaries`, { params })
      .then(r => {
        const paged = r.data?.data;
        setSalaries((paged?.content ?? []).map(mapSalary));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoadingEnt(false));
  }, [company.id, tab, page, filterFunctionId, filterLevelId, filterLocations, sortBy]);

  function applyFilter(setter, value) { setter(value); setPage(0); }

  const maxTC = levels ? Math.max(...levels.map(l => l.avgTC ?? 0), 1) : 1;
  const hasTcRange = company.tcMin != null && company.tcMax != null;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', zIndex:300 }} />
      <div className="company-modal-root" style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        zIndex:301, width:'min(860px, 94vw)', height:'88vh',
        background:'var(--panel)', border:'1px solid var(--border)',
        borderRadius:20, overflow:'hidden', display:'flex', flexDirection:'column',
      }}>

        {/* Header */}
        <div className="modal-header" style={{ padding:'24px 28px 0', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              <CompanyLogo
                companyId={company.id}
                companyName={company.name}
                logoUrl={company.logoUrl}
                website={company.website}
                size={46}
                radius={12}
              />
              <div>
                <div style={{ fontSize:18, fontWeight:600, color:'var(--text-1)' }}>{company.name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
                  {company.industry}{company.website ? ` · ${company.website.replace(/^https?:\/\//, '')}` : ''}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:8, width:30, height:30, cursor:'pointer', color:'var(--text-2)', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
          </div>

          {/* Stat bar — single surface with internal dividers */}
          <div className="company-modal-statbar" style={{ display:'flex', background:'var(--bg-2)', borderRadius:10, marginBottom:18, overflow:'hidden' }}>
            {[
              { label:'Entries',  value: company.entries, accent: false },
              { label:'Median TC', value: company.avgTC,   accent: false },
              { label:'TC Range', value: hasTcRange ? `${fmtSalary(company.tcMin)} – ${fmtSalary(company.tcMax)}` : '—', accent: true },
            ].map((s, i) => (
              <div key={s.label} style={{
                display:'flex', flexDirection:'column', padding:'10px 16px',
                borderLeft: i === 0 ? 'none' : '0.5px solid var(--border)',
                flex: i === 2 ? '2' : '1',
              }}>
                <div style={{ fontSize:9, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', marginBottom:4 }}>{s.label}</div>
                <div className="tc-range-mono" style={{ fontSize:15, fontWeight:500, fontFamily:"'IBM Plex Mono',monospace", color: s.accent ? '#3b82f6' : 'var(--text-1)', whiteSpace:'nowrap' }}>
                  {s.value ?? '—'}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="modal-tabs" style={{ display:'flex' }}>
            {[
              { id:'levels',   label:'TC by level' },
              { id:'entries',  label:'All entries' },
              { id:'benefits', label:'Benefits' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(0); }}
                style={{
                  padding:'9px 18px', fontSize:13, fontWeight:500,
                  color: tab === t.id ? '#3b82f6' : 'var(--text-3)',
                  background:'none', border:'none', cursor:'pointer',
                  borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
                  marginBottom:'-1px', transition:'color 0.15s',
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ overflowY:'auto', flex:1, padding:'20px 28px 28px' }}>

          {/* TC by level */}
          {tab === 'levels' && (
            <>
              <style>{`
                @keyframes lvlSpin { to { transform: rotate(360deg); } }
                .fn-chip:hover { opacity: 0.85; }
                .fn-more-chip:hover { border-color: #3b82f6 !important; color: #3b82f6 !important; }
                .pop-item:hover { background: var(--bg-2); }
                .lvl-bar-row:hover .lvl-bar-sub { opacity: 1 !important; }
              `}</style>

              {/* Loading */}
              {loadingLvl && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:14 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', border:'2.5px solid var(--border)', borderTopColor:'#3b82f6', animation:'lvlSpin 0.7s linear infinite' }} />
                  <span style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>Loading breakdown…</span>
                </div>
              )}

              {/* Empty */}
              {!loadingLvl && levels && levels.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:13, fontStyle:'italic' }}>
                  No level breakdown available yet.
                </div>
              )}

              {!loadingLvl && levels && levels.length > 0 && (
                <div style={{ paddingTop:4 }}>

                  {/* Function selector row */}
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, flexWrap:'wrap', position:'relative' }}>
                    <span style={{ fontSize:10, color:'var(--text-3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>Function</span>

                    {/* Top 3 chips — always Engineering, Product, Design */}
                    {top3Fns.map(fn => {
                      const pal     = fnPaletteMap[fn.name] ?? FN_PALETTE[0];
                      const isActive = selectedFn === fn.name;
                      const isEmpty  = fn.count === 0;
                      return (
                        <button
                          key={fn.name}
                          className="fn-chip"
                          onClick={() => { if (!isEmpty) { setSelectedFn(isActive ? null : fn.name); setPopoverOpen(false); } }}
                          style={{
                            display:'inline-flex', alignItems:'center', gap:5,
                            fontSize:12, fontWeight:500, padding:'5px 12px', borderRadius:6,
                            border:'none', cursor: isEmpty ? 'default' : 'pointer', transition:'opacity 0.15s',
                            background: isEmpty ? 'var(--bg-2)' : isActive ? pal.bar   : pal.bg,
                            color:      isEmpty ? 'var(--text-3)' : isActive ? '#fff'    : pal.color,
                            opacity:    isEmpty ? 0.55 : 1,
                          }}
                        >
                          <span style={{ width:6, height:6, borderRadius:'50%', background: isEmpty ? 'var(--text-3)' : isActive ? 'rgba(255,255,255,0.6)' : pal.bar, flexShrink:0 }} />
                          {fn.name}
                          <span style={{ fontSize:10, opacity:0.7 }}>{fn.count}</span>
                        </button>
                      );
                    })}

                    {/* + More chip + popover */}
                    {moreFns.length > 0 && (
                      <div className="fn-more-popover-wrap" style={{ position:'relative' }}>
                        <button
                          className="fn-more-chip"
                          onClick={() => { setPopoverOpen(o => !o); setPopoverSearch(''); }}
                          style={{
                            fontSize:12, fontWeight:500, padding:'5px 12px', borderRadius:6,
                            background:'var(--bg-2)', color: popoverOpen ? '#3b82f6' : 'var(--text-2)',
                            border:`1px solid ${popoverOpen ? '#3b82f6' : 'var(--border)'}`,
                            cursor:'pointer', transition:'all 0.15s',
                          }}
                        >
                          + {moreFns.length} more {popoverOpen ? '▴' : '▾'}
                        </button>

                        {popoverOpen && (
                          <div style={{
                            position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:20,
                            background:'var(--panel)', border:'1px solid var(--border)',
                            borderRadius:10, padding:8, minWidth:190,
                            boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
                          }}>
                            {moreFns.length > 4 && (
                              <input
                                autoFocus
                                placeholder="Search functions…"
                                value={popoverSearch}
                                onChange={e => setPopoverSearch(e.target.value)}
                                style={{
                                  width:'100%', fontSize:12, padding:'6px 10px',
                                  border:'1px solid var(--border)', borderRadius:6,
                                  background:'var(--bg-2)', color:'var(--text-1)',
                                  outline:'none', marginBottom:6, boxSizing:'border-box',
                                }}
                              />
                            )}
                            {filteredMoreFns.length === 0 && (
                              <div style={{ fontSize:12, color:'var(--text-3)', padding:'8px 10px', fontStyle:'italic' }}>No match</div>
                            )}
                            {filteredMoreFns.map(fn => {
                              const pal = fnPaletteMap[fn.name] ?? FN_PALETTE[0];
                              const isActive = selectedFn === fn.name;
                              return (
                                <div
                                  key={fn.name}
                                  className="pop-item"
                                  onClick={() => { setSelectedFn(fn.name); setPopoverOpen(false); setPopoverSearch(''); }}
                                  style={{
                                    display:'flex', alignItems:'center', gap:8,
                                    padding:'7px 10px', borderRadius:6, cursor:'pointer',
                                    background: isActive ? pal.bg : 'transparent',
                                    fontSize:12, color: isActive ? pal.color : 'var(--text-1)',
                                    fontWeight: isActive ? 500 : 400,
                                  }}
                                >
                                  <span style={{ width:7, height:7, borderRadius:'50%', background:pal.bar, flexShrink:0 }} />
                                  <span style={{ flex:1 }}>{fn.name}</span>
                                  <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>{fn.count}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* No function selected or selected function has no data */}
                  {(!selectedFn || activeFnLevels.length === 0) && (
                    <div style={{ textAlign:'center', padding:'36px 0', color:'var(--text-3)', fontSize:13, fontStyle:'italic' }}>
                      {!selectedFn
                        ? 'Select a function above to view the level breakdown'
                        : `No data available for ${selectedFn} yet`}
                    </div>
                  )}

                  {/* Level bars for selected function */}
                  {selectedFn && activeFnLevels.length > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", marginBottom:4 }}>
                        {selectedFn} · {activeFnLevels.length} level{activeFnLevels.length !== 1 ? 's' : ''} · median TC
                      </div>
                      {activeFnLevels.map(l => {
                        const pal = fnPaletteMap[selectedFn] ?? FN_PALETTE[0];
                        const pct = Math.round(((l.avgTC ?? 0) / maxActivTC) * 100);
                        return (
                          <div key={l.internalLevel} className="lvl-bar-row" style={{ marginBottom:2 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <span style={{ fontSize:12, color:'var(--text-2)', width:110, flexShrink:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                {l.internalLevel}
                              </span>
                              <div style={{ flex:1, height:8, background:'var(--bg-2)', borderRadius:4, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${pct}%`, background:pal.bar, borderRadius:4, transition:'width 0.35s ease' }} />
                              </div>
                              <span style={{ fontSize:12, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-1)', minWidth:52, textAlign:'right', flexShrink:0 }}>
                                {fmtSalary(l.avgTC)}
                              </span>
                              <span className="lvl-bar-sub" style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", minWidth:44, textAlign:'right', flexShrink:0, opacity:0.7, transition:'opacity 0.15s' }}>
                                {l.count} {l.count === 1 ? 'entry' : 'entries'}
                              </span>
                            </div>
                            {/* Comp breakdown sub-row */}
                            {(l.avgBase || l.avgBonus || l.avgEquity) && (
                              <div style={{ display:'flex', gap:12, marginTop:3, paddingLeft:120 }}>
                                {l.avgBase && (
                                  <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
                                    Base <span style={{ color:'var(--text-2)', fontWeight:500 }}>{fmtSalary(l.avgBase)}</span>
                                  </span>
                                )}
                                {l.avgBonus && (
                                  <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
                                    Bonus <span style={{ color:'var(--text-2)', fontWeight:500 }}>{fmtSalary(l.avgBonus)}</span>
                                  </span>
                                )}
                                {l.avgEquity && (
                                  <span style={{ fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
                                    RSU <span style={{ color:'var(--text-2)', fontWeight:500 }}>{fmtSalary(l.avgEquity)}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}
            </>
          )}

          {/* All entries */}
          {tab === 'entries' && (
            <>
              {/* Filter + sort bar */}
              <div className="entries-filter-bar" style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>

                {/* Function dropdown */}
                <select
                  value={filterFunctionId}
                  onChange={e => { applyFilter(setFilterFunctionId, e.target.value); applyFilter(setFilterLevelId, ''); }}
                  style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:'0.5px solid var(--border)', background:'var(--bg-2)', color:'var(--text-2)', cursor:'pointer' }}
                >
                  {functionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                {/* Level dropdown — only shown when a function is selected */}
                {filterFunctionId && (
                  <select
                    value={filterLevelId}
                    onChange={e => applyFilter(setFilterLevelId, e.target.value)}
                    style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:'0.5px solid var(--border)', background:'var(--bg-2)', color:'var(--text-2)', cursor:'pointer' }}
                  >
                    {levelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}

                {/* Location multi-select combobox */}
                <div className="loc-btn-wrap" ref={locationPopRef} style={{ position:'relative' }}>
                  <button
                    onClick={() => setLocationPopover(o => !o)}
                    style={{
                      fontSize:11, padding:'5px 10px', borderRadius:8,
                      border:`0.5px solid ${locationPopover ? '#3b82f6' : filterLocations.length > 0 ? '#3b82f6' : 'var(--border)'}`,
                      background: filterLocations.length > 0 ? '#E6F1FB' : 'var(--bg-2)',
                      color: filterLocations.length > 0 ? '#185FA5' : 'var(--text-2)',
                      cursor:'pointer', display:'flex', alignItems:'center', gap:5,
                    }}
                  >
                    {filterLocations.length === 0
                      ? 'All locations'
                      : filterLocations.length === 1
                        ? LOCATION_OPTIONS.find(l => l.value === filterLocations[0])?.label
                        : `${filterLocations.length} locations`}
                    {filterLocations.length > 0 && (
                      <span
                        onClick={e => { e.stopPropagation(); applyFilter(setFilterLocations, []); }}
                        style={{ fontSize:13, opacity:0.6, lineHeight:1 }}
                      >×</span>
                    )}
                    <span style={{ opacity:0.5, fontSize:9 }}>{locationPopover ? '▴' : '▾'}</span>
                  </button>

                  {locationPopover && (
                    <div style={{
                      position:'absolute', top:'calc(100% + 5px)', left:0, zIndex:25,
                      background:'var(--panel)', border:'1px solid var(--border)',
                      borderRadius:10, padding:6, minWidth:160,
                      boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
                    }}>
                      {LOCATION_OPTIONS.map(loc => {
                        const checked = filterLocations.includes(loc.value);
                        return (
                          <label
                            key={loc.value}
                            style={{
                              display:'flex', alignItems:'center', gap:8,
                              padding:'6px 10px', borderRadius:6, cursor:'pointer',
                              background: checked ? '#E6F1FB' : 'transparent',
                              color: checked ? '#185FA5' : 'var(--text-1)',
                              fontSize:12, fontWeight: checked ? 500 : 400,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? filterLocations.filter(l => l !== loc.value)
                                  : [...filterLocations, loc.value];
                                applyFilter(setFilterLocations, next);
                              }}
                              style={{ accentColor:'#3b82f6', cursor:'pointer' }}
                            />
                            {loc.label}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sort */}
                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={e => applyFilter(setSortBy, e.target.value)}
                  style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:'0.5px solid var(--border)', background:'var(--bg-2)', color:'var(--text-2)', cursor:'pointer', marginLeft:'auto' }}
                >
                  <option value="totalCompensation">Sort: TC ↓</option>
                  <option value="baseSalary">Sort: Base ↓</option>
                  <option value="createdAt">Sort: Date ↓</option>
                </select>
              </div>

              {/* Spinner */}
              {loadingEnt ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 0', gap:14 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', border:'2.5px solid var(--border)', borderTopColor:'#3b82f6', animation:'lvlSpin 0.7s linear infinite' }} />
                  <span style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>Loading entries…</span>
                </div>
              ) : (
                <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", marginBottom:12 }}>
                  {`Showing ${Math.min(page*10+1, totalElements)}–${Math.min((page+1)*10, totalElements)} of ${totalElements} entr${totalElements !== 1 ? 'ies' : 'y'}`}
                </div>
              )}

              {!loadingEnt && salaries.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-3)', fontSize:13, fontStyle:'italic' }}>
                  No entries found{filterFunctionId || filterLocations.length > 0 ? ' for the selected filters' : ''}.
                </div>
              )}

              {!loadingEnt && salaries.length > 0 && (
                <>
                  {/* Desktop grid — hidden on mobile */}
                  <div className="entries-desktop" style={{ display:'flex', flexDirection:'column', gap:0 }}>
                    {/* Header row */}
                    <div style={{
                      display:'grid',
                      gridTemplateColumns:'1fr 130px 100px 52px 90px 80px 80px 96px 80px',
                      padding:'6px 14px',
                      borderBottom:'1px solid var(--border)',
                      marginBottom:2,
                    }}>
                      {['Role','Level','Location','Exp','Base','Bonus','RSU','Total TC','Date'].map(h => (
                        <div key={h} style={{ fontSize:9, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)' }}>{h}</div>
                      ))}
                    </div>

                    {/* Entry rows */}
                    {salaries.map((s, idx) => (
                      <div
                        key={s.id}
                        style={{
                          display:'grid',
                          gridTemplateColumns:'1fr 130px 100px 52px 90px 80px 80px 96px 80px',
                          padding:'11px 14px',
                          borderRadius:10,
                          background: idx % 2 === 0 ? 'transparent' : 'var(--bg-2)',
                          alignItems:'center',
                          transition:'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--ink-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--bg-2)'}
                      >
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.role}</div>
                        </div>
                        <div>
                          <span style={getLevelBadgeStyle(s.internalLevel !== '—' ? s.internalLevel : null)}>
                            {s.internalLevel !== '—' ? s.internalLevel : '—'}
                          </span>
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.location}</div>
                        <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>{s.yoe}</div>
                        <div style={{ fontSize:13, fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-1)', fontWeight:500 }}>{s.base}</div>
                        <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>{s.bonus}</div>
                        <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>{s.equity}</div>
                        <div style={{ fontSize:14, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", color:'#3b82f6', whiteSpace:'nowrap' }}>{s.tc}</div>
                        <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace", whiteSpace:'nowrap' }}>{s.recordedAt}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile cards — shown only on mobile */}
                  <div className="entries-mobile" style={{ display:'none', flexDirection:'column', gap:8 }}>
                    {salaries.map(s => (
                      <div key={s.id} style={{
                        background:'var(--bg-2)', border:'1px solid var(--border)',
                        borderRadius:12, padding:'12px 14px',
                      }}>
                        {/* Top: role + TC */}
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                          <div style={{ minWidth:0, flex:1, marginRight:8 }}>
                            <div style={{ fontSize:14, fontWeight:600, color:'var(--text-1)', marginBottom:3 }}>{s.role}</div>
                            <span style={getLevelBadgeStyle(s.internalLevel !== '—' ? s.internalLevel : null)}>
                              {s.internalLevel !== '—' ? s.internalLevel : '—'}
                            </span>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:16, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace", color:'#3b82f6' }}>{s.tc}</div>
                            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>Total TC</div>
                          </div>
                        </div>
                        {/* Bottom: meta row */}
                        <div style={{ display:'flex', gap:12, flexWrap:'wrap', paddingTop:8, borderTop:'0.5px solid var(--border)' }}>
                          {[
                            { label:'Location', value: s.location },
                            { label:'Exp',      value: s.yoe      },
                            { label:'Base',     value: s.base     },
                            { label:'Bonus',    value: s.bonus    },
                            { label:'RSU',      value: s.equity   },
                            { label:'Date',     value: s.recordedAt },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <div style={{ fontSize:9, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-3)', marginBottom:2 }}>{label}</div>
                              <div style={{ fontSize:12, color:'var(--text-2)', fontFamily:"'IBM Plex Mono',monospace" }}>{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination — smart ellipsis */}
                  {totalPages > 1 && (() => {
                    const delta = 2;
                    const pages = [];
                    const left  = Math.max(0, page - delta);
                    const right = Math.min(totalPages - 1, page + delta);
                    if (left > 0) pages.push({ type:'num', n:0 });
                    if (left > 1) pages.push({ type:'ellipsis', key:'l' });
                    for (let i = left; i <= right; i++) pages.push({ type:'num', n:i });
                    if (right < totalPages - 2) pages.push({ type:'ellipsis', key:'r' });
                    if (right < totalPages - 1) pages.push({ type:'num', n:totalPages-1 });
                    return (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:14, paddingTop:12, borderTop:'0.5px solid var(--border)' }}>
                        <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
                          Page {page+1} of {totalPages}
                        </span>
                        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                          <button className="page-btn" disabled={page===0} onClick={() => setPage(0)} title="First">«</button>
                          <button className="page-btn" disabled={page===0} onClick={() => setPage(p=>p-1)}>←</button>
                          {pages.map((p,i) => p.type === 'ellipsis'
                            ? <span key={p.key} style={{ fontSize:12, color:'var(--text-3)', padding:'0 4px' }}>…</span>
                            : <button key={p.n} className={`page-btn${p.n===page?' active':''}`} onClick={() => setPage(p.n)}>{p.n+1}</button>
                          )}
                          <button className="page-btn" disabled={page===totalPages-1} onClick={() => setPage(p=>p+1)}>→</button>
                          <button className="page-btn" disabled={page===totalPages-1} onClick={() => setPage(totalPages-1)} title="Last">»</button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </>
          )}

          {/* Benefits */}
          {tab === 'benefits' && <BenefitsGrid benefits={company.benefits} />}

        </div>
      </div>
    </>
  );
}

// ── Company Card ──────────────────────────────────────────────────────────────
function CompanyCard({ c, onViewDetails, openRoles }) {
  const hasData        = c.entries > 0;
  const hasTcRange     = c.tcMin != null && c.tcMax != null;
  const tcRangeStr     = hasTcRange ? `${fmtSalary(c.tcMin)} – ${fmtSalary(c.tcMax)}` : c.avgTC !== '—' ? c.avgTC : '—';
  const previewBenefits= (c.benefits ?? []).slice(0, BENEFITS_PREVIEW);
  const extraBenefits  = (c.benefits ?? []).length - BENEFITS_PREVIEW;

  return (
    <div
      className="company-card fade-up"
      style={{
        cursor: 'default',
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'transform 0.15s, box-shadow 0.15s',
        position: 'relative',
        // Dim empty cards so verified ones stand out
        opacity: hasData ? 1 : 0.6,
        background: hasData ? undefined : 'var(--bg-1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.18)';
        if (!hasData) e.currentTarget.style.opacity = '0.85';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
        if (!hasData) e.currentTarget.style.opacity = '0.6';
      }}
    >
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <CompanyLogo companyId={c.id} companyName={c.name} logoUrl={c.logoUrl} website={c.website} size={40} radius={10} style={{ border:'0.5px solid var(--border)', flexShrink:0 }} />
          <div style={{ paddingTop:2 }}>
            <div className="company-card-name" style={{ marginBottom:0 }}>{c.name}</div>
            <div className="company-card-industry">{c.industry}</div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0, marginTop:2 }}>
          {hasData ? (
            <span style={{
              fontFamily:"'IBM Plex Mono',monospace", fontSize:10,
              color:'#3B6D11', background:'rgba(99,153,34,0.12)',
              padding:'2px 7px', borderRadius:6,
              border:'1px solid rgba(99,153,34,0.25)', whiteSpace:'nowrap',
            }}>
              {c.entries} {c.entries === 1 ? 'entry' : 'entries'}
            </span>
          ) : (
            <span style={{
              fontFamily:"'IBM Plex Mono',monospace", fontSize:10,
              color:'var(--text-3)', background:'var(--bg-2)',
              padding:'2px 7px', borderRadius:6,
              border:'1px solid var(--border)', whiteSpace:'nowrap',
            }}>
              no data yet
            </span>
          )}
        </div>
      </div>

      <div style={{ height:'0.5px', background:'var(--border)' }} />

      {/* Open roles — notched tab pill floating above top-right card edge */}
      {openRoles > 0 && (
        <Link
          to={`/opportunities?company=${encodeURIComponent(c.name)}`}
          onClick={e => e.stopPropagation()}
          style={{
            position:'absolute', top:0, right:16, transform:'translateY(-50%)',
            display:'inline-flex', alignItems:'center', gap:6,
            background:'#16a34a', color:'#fff',
            fontSize:11, fontWeight:600,
            padding:'4px 11px', borderRadius:20,
            textDecoration:'none', whiteSpace:'nowrap',
            boxShadow:'0 2px 8px rgba(22,163,74,0.35)',
            zIndex:2,
          }}
        >
          <span style={{ position:'relative', width:7, height:7, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#fff', opacity:0.4, animation:'roleRipple 1.8s ease-out infinite' }} />
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#fff', position:'relative' }} />
          </span>
          {openRoles} open {openRoles === 1 ? 'role' : 'roles'}
        </Link>
      )}
      <style>{`@keyframes roleRipple { 0%{transform:scale(1);opacity:0.4} 100%{transform:scale(2.5);opacity:0} }`}</style>

      {hasData ? (
        <>
          {/* TC range pill — opens modal on click */}
          <button
            onClick={e => { e.stopPropagation(); onViewDetails('levels'); }}
            style={{
              display:'flex', flexDirection:'column', gap:5,
              width:'100%', background:'var(--bg-2)', border:'0.5px solid var(--border)',
              borderRadius:10, padding:'10px 14px', cursor:'pointer', textAlign:'left',
              transition:'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <span style={{ fontSize:9, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-3)' }}>
              {hasTcRange ? 'TC range' : 'Median TC'}
            </span>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, flexWrap:'wrap' }}>
              <span className="tc-range-value" style={{ fontSize:13, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", color:'var(--text-1)', whiteSpace:'nowrap', minWidth:0 }}>
                {tcRangeStr}
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, fontWeight:500, color:'#3b82f6', whiteSpace:'nowrap', flexShrink:0 }}>
                View breakdown
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
            </div>
          </button>

          <div style={{ height:'0.5px', background:'var(--border)' }} />

          {/* Benefits preview */}
          <div>
            <div style={{ fontSize:10, fontWeight:500, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:6 }}>Benefits</div>
            {previewBenefits.length > 0 ? (
              <div className="benefits-row" style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                {previewBenefits.map((b, i) => {
                  const name = typeof b === 'string' ? b : b.name;
                  return (
                    <span key={i} style={{ fontSize:10, color:'var(--text-2)', background:'var(--bg-2)', border:'0.5px solid var(--border)', borderRadius:6, padding:'3px 8px', display:'flex', alignItems:'center', gap:4 }}>
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      {name}
                    </span>
                  );
                })}
                {extraBenefits > 0 && (
                  <button onClick={e => { e.stopPropagation(); onViewDetails('benefits'); }} style={{ fontSize:10, color:'#3b82f6', fontWeight:500, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                    +{extraBenefits} more
                  </button>
                )}
              </div>
            ) : (
              <div style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>Not added yet</div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto' }}>
            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'var(--text-3)' }}>Updated {c.updatedLabel}</span>
            <button
              onClick={e => { e.stopPropagation(); onViewDetails('levels'); }}
              style={{ fontSize:11, fontWeight:500, color:'#3b82f6', background:'rgba(59,130,246,0.08)', border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer' }}
            >
              View details →
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Empty state — CTA to contribute */}
          <div style={{
            flex:1, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            gap:10, padding:'16px 8px',
            textAlign:'center',
          }}>
            <div style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic', lineHeight:1.5 }}>
              Be the first to share salary data for {c.name}
            </div>
            <Link
              to="/submit-salary"
              onClick={e => e.stopPropagation()}
              style={{
                display:'inline-flex', alignItems:'center', gap:5,
                fontSize:11, fontWeight:600,
                color:'#3b82f6',
                background:'rgba(59,130,246,0.08)',
                border:'1px solid rgba(59,130,246,0.25)',
                borderRadius:8, padding:'6px 14px',
                textDecoration:'none',
                transition:'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(59,130,246,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(59,130,246,0.08)'}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add salary data
            </Link>
          </div>

          {/* Footer */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto' }}>
            <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'var(--text-3)' }}>Updated {c.updatedLabel}</span>
            <button
              onClick={e => { e.stopPropagation(); onViewDetails('levels'); }}
              style={{ fontSize:11, fontWeight:500, color:'var(--text-3)', background:'var(--bg-2)', border:'0.5px solid var(--border)', borderRadius:6, padding:'5px 12px', cursor:'pointer' }}
            >
              View details →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main CompaniesPage ────────────────────────────────────────────────────────
export default function CompaniesPage() {
  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [inputValue,    setInputValue]    = useState('');
  const [search,        setSearch]        = useState('');
  const [location,      setLocation]      = useState('');
  const debounceRef = useRef(null);
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [selected,      setSelected]      = useState(null); // { company, initialTab }
  const [hiringMap,     setHiringMap]     = useState(new Map());
  const [sortBy,        setSortBy]        = useState('entries'); // entries | name | recent
  const [showAll,       setShowAll]       = useState(false);

  const { functions: jobFunctions } = useAppData();

  useEffect(() => {
    api.get("/public/companies/hiring-now")
      .then(r => {
        const hMap = new Map();
        for (const item of r.data?.data ?? []) {
          if (item.companyId) hMap.set(String(item.companyId), Number(item.openRoles));
        }
        setHiringMap(hMap);
      })
      .catch(() => {});
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function commitSearch(val) { clearTimeout(debounceRef.current); setSearch(val); setPage(0); }

  function handleSearchChange(e) {
    const val = e.target.value;
    setInputValue(val);
    clearTimeout(debounceRef.current);
    if (val.length === 0) { commitSearch(''); return; }
    if (val.length < SEARCH_MIN_CHARS) return;
    debounceRef.current = setTimeout(() => commitSearch(val), SEARCH_DEBOUNCE);
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter' && inputValue.length >= SEARCH_MIN_CHARS) commitSearch(inputValue);
  }

  const fetchCompanies = useCallback(() => {
    setLoading(true); setError(null);
    api.get('/public/companies', { params: {
      page, size: PAGE_SIZE,
      ...(search && { name: search }),
      ...(location && { location }),
      sortBy,
      showAll: showAll || !!search, // always show all when searching so users find 0-entry companies too
    }})
      .then(r => {
        const paged = r.data?.data;
        setItems((paged?.content ?? []).map(c => ({
          id: c.id, name: c.name ?? '—', industry: c.industry ?? '—',
          logoUrl: c.logoUrl ?? null, website: c.website ?? null,
          updatedLabel: fmtDate(c.updatedAt ?? c.createdAt),
          entries: c.entryCount ?? 0,
          avgBase: fmtSalary(c.avgBaseSalary),
          avgTC:   fmtSalary(c.avgTotalCompensation),
          tcMin:   c.tcMin ?? null, tcMax: c.tcMax ?? null,
          benefits: c.benefits ?? [],
          levelCategory: c.companyLevelCategory ?? null,
        })));
        setTotalPages(paged?.totalPages ?? 1);
        setTotalElements(paged?.totalElements ?? 0);
      })
      .catch(err => setError(`Failed to load companies (${err.response?.status ?? 'network error'})`))
      .finally(() => setLoading(false));
  }, [page, search, location, sortBy, showAll]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);
  useEffect(() => { setPage(0); }, [sortBy, showAll, location]);

  return (
    <section className="section">
      <style>{`
        @keyframes progressCrawl { 0%{width:0%} 40%{width:65%} 70%{width:82%} 100%{width:90%} }
        @keyframes companyCrawl  { 0%{transform:translateX(-100%)} 100%{transform:translateX(250%)} }
        @keyframes companyFadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }

        /* ── Mobile-only card fixes (≤768px) ── */
        @media (max-width: 768px) {
          /* Full-width single column instead of clipped 2-col grid */
          .companies-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          /* Prevent company name + entries badge from overflowing */
          .company-card-name {
            font-size: 14px !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          /* Entries badge: don't let it get clipped */
          .company-card .entries-badge-mono {
            font-size: 10px !important;
            white-space: nowrap !important;
          }
          /* TC range value: allow wrap on very small screens */
          .company-card .tc-range-value {
            font-size: 12px !important;
            white-space: normal !important;
          }
          /* Benefits chips: wrap naturally */
          .company-card .benefits-row {
            flex-wrap: wrap !important;
          }
          /* Modal: full screen bottom sheet on mobile */
          .company-modal-root {
            width: 100vw !important;
            max-width: 100vw !important;
            height: 92vh !important;
            top: auto !important;
            bottom: 0 !important;
            left: 0 !important;
            transform: none !important;
            border-radius: 20px 20px 0 0 !important;
          }
          /* Tighter modal padding on mobile */
          .company-modal-root .modal-body {
            padding: 16px 16px 24px !important;
          }
          .company-modal-root .modal-header {
            padding: 18px 16px 0 !important;
          }
          /* Stat bar: wrap into 2-across grid */
          .company-modal-statbar {
            flex-wrap: wrap !important;
          }
          .company-modal-statbar > div {
            border-left: none !important;
            border-top: 0.5px solid var(--border) !important;
            flex: 1 1 45% !important;
            min-width: 0 !important;
          }
          .company-modal-statbar > div:nth-child(-n+2) {
            border-top: none !important;
          }
          /* TC Range value: allow text to wrap rather than overflow */
          .company-modal-statbar .tc-range-mono {
            font-size: 12px !important;
            white-space: normal !important;
            word-break: break-all !important;
          }
          /* Tabs: allow scroll if they overflow */
          .modal-tabs {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            flex-wrap: nowrap !important;
          }
          .modal-tabs button {
            flex-shrink: 0 !important;
            padding: 9px 14px !important;
          }
          /* Filter bar: stack vertically */
          .entries-filter-bar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .entries-filter-bar select,
          .entries-filter-bar .loc-btn-wrap {
            width: 100% !important;
          }
          .entries-filter-bar .sort-select {
            margin-left: 0 !important;
          }
          /* Entries: hide desktop grid, show mobile cards */
          .entries-desktop { display: none !important; }
          .entries-mobile  { display: flex !important; }
          /* Benefits tabs: allow horizontal scroll */
          .ben-tabs-row {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            flex-wrap: nowrap !important;
            padding-bottom: 4px !important;
          }
          .ben-tabs-row button { flex-shrink: 0 !important; }
          /* Benefits grid: 2 col on mobile */
          .ben-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          /* Level bar label width: tighter on mobile */
          .lvl-bar-label { width: 80px !important; }
          .lvl-bar-sub   { display: none !important; }
        }

        @media (max-width: 420px) {
          .ben-grid { grid-template-columns: 1fr !important; }
          .company-modal-statbar > div { flex: 1 1 100% !important; }
          .company-modal-statbar > div:nth-child(-n+1) { border-top: none !important; }
          .company-modal-statbar > div:nth-child(2) { border-top: 0.5px solid var(--border) !important; }
        }
      `}</style>

      <div className="section-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:16, marginBottom:32 }}>
        <div>
          <span className="section-tag">Company Directory</span>
          <h2 className="section-title">Browse <em>Companies</em></h2>
        </div>
        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:12, color:'var(--text-3)', padding:'6px 14px', background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:8 }}>
          {loading ? 'Loading…' : (!showAll && !search) ? `${totalElements} compan${totalElements !== 1 ? 'ies' : 'y'} with data` : `${items.filter(c => c.entries > 0).length} with data · ${totalElements} total`}
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom:32, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <div className="search-box" style={{ width:'100%' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="input-field" type="text" placeholder="Search companies…" value={inputValue} onChange={handleSearchChange} onKeyDown={handleSearchKeyDown} style={{ paddingRight: inputValue.length >= SEARCH_MIN_CHARS && inputValue !== search ? 68 : 10 }} />
            {inputValue.length >= SEARCH_MIN_CHARS && inputValue !== search && (
              <span onClick={() => commitSearch(inputValue)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:10, color:'#3b82f6', fontFamily:"'IBM Plex Mono',monospace", cursor:'pointer', userSelect:'none', background:'var(--bg-2)', padding:'1px 5px', borderRadius:4, border:'1px solid var(--border)', whiteSpace:'nowrap' }}>↵ Search</span>
            )}
          </div>
          {inputValue.length > 0 && inputValue.length < SEARCH_MIN_CHARS && (
            <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, fontSize:10, color:'var(--text-3)', fontFamily:"'IBM Plex Mono',monospace" }}>
              Type {SEARCH_MIN_CHARS - inputValue.length} more character{SEARCH_MIN_CHARS - inputValue.length !== 1 ? 's' : ''} to search
            </div>
          )}
        </div>

        {/* Industry filter */}
        {/* Location filter */}
        <select
          value={location}
          onChange={e => { setLocation(e.target.value); setPage(0); }}
          style={{
            fontSize: 12, padding: '8px 12px', borderRadius: 9,
            border: location ? '1px solid #3b82f6' : '1px solid var(--border)',
            background: location ? 'rgba(59,130,246,0.06)' : 'var(--bg-1)',
            color: location ? '#3b82f6' : 'var(--text-2)',
            cursor: 'pointer', outline: 'none',
            fontFamily: "Inter,sans-serif",
          }}
        >
          <option value="">All Locations</option>
          <option value="BENGALURU">Bengaluru</option>
          <option value="HYDERABAD">Hyderabad</option>
          <option value="PUNE">Pune</option>
          <option value="DELHI_NCR">Delhi NCR</option>
          <option value="MUMBAI">Mumbai</option>
          <option value="CHENNAI">Chennai</option>
          <option value="KOLKATA">Kolkata</option>
          <option value="REMOTE">Remote</option>
        </select>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            fontSize: 12, padding: '8px 12px', borderRadius: 9,
            border: '1px solid var(--border)', background: 'var(--bg-1)',
            color: 'var(--text-2)', cursor: 'pointer', outline: 'none',
            fontFamily: "Inter,sans-serif",
          }}
        >
          <option value="entries">Sort: Most Data</option>
          <option value="recent">Sort: Recently Updated</option>
          <option value="name">Sort: A–Z</option>
        </select>

        {/* Show all toggle */}
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            fontSize: 12, padding: '8px 14px', borderRadius: 9,
            border: '1px solid #3b82f6',
            background: showAll ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
            color: '#3b82f6',
            cursor: 'pointer', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s', whiteSpace: 'nowrap',
            fontFamily: "Inter,sans-serif",
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>{showAll ? '◉' : '○'}</span>
          {showAll ? 'Showing all companies' : 'Show all companies'}
        </button>
      </div>

      {loading && (
        <div style={{ padding:'60px 0 58px' }}>
          <div style={{ width:'100%', height:3, background:'var(--bg-3)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,#38bdf8,#0ea5e9)', borderRadius:99, animation:'progressCrawl 2s cubic-bezier(0.05,0.6,0.4,1) forwards' }} />
          </div>
        </div>
      )}
      {!loading && error && <div style={{ padding:'16px 20px', background:'var(--rose-dim)', border:'1px solid rgba(224,92,122,0.2)', borderRadius:12, color:'var(--rose)', fontSize:13 }}>{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🔍</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:'var(--text-1)', marginBottom:8 }}>No companies found</div>
          <div style={{ fontSize:14, color:'var(--text-3)' }}>Try a different search or clear filters</div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="companies-grid" style={{ paddingTop: 14, overflow: 'visible' }}>
            {items.map(c => (
              <CompanyCard key={c.id} c={c} onViewDetails={(initialTab) => setSelected({ company: c, initialTab })} openRoles={hiringMap.get(String(c.id)) ?? 0} />
            ))}
          </div>

          {/* Nudge banner — only show in data-only mode (not showAll, not searching) */}
          {!showAll && !search && (
            <div style={{
              marginTop: 24,
              padding: '14px 20px',
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>Only showing companies with verified salary data.</span>
                {' '}Many more companies are listed but don't have data yet.
              </div>
              <button
                onClick={() => setShowAll(true)}
                style={{
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  padding: '7px 16px', borderRadius: 8,
                  background: '#3b82f6', color: '#fff',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Show all companies →
              </button>
            </div>
          )}
          {totalPages > 1 && (
            <div className="pagination">
              <span className="page-info">Showing {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE, totalElements)} of {totalElements}</span>
              <div className="page-btns">
                <button className="page-btn" disabled={page===0} onClick={() => setPage(p=>p-1)}>←</button>
                {Array.from({ length: totalPages }, (_,i) => i).map(p => (
                  <button key={p} className={`page-btn${p===page?' active':''}`} onClick={() => setPage(p)}>{p+1}</button>
                ))}
                <button className="page-btn" disabled={page===totalPages-1} onClick={() => setPage(p=>p+1)}>→</button>
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <CompanyModal
          company={selected.company}
          initialTab={selected.initialTab}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

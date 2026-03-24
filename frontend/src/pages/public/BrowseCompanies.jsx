import { useState, useMemo } from "react";

// ── DATA (from salaryData.js) ──────────────────────────────────────────────
const ALL_COMPANIES = [
  { name: 'Zepto',        industry: 'Quick Commerce', abbr: 'Z',  color: '#3ecfb0', colorBg: 'rgba(62,207,176,0.15)',   entries: 128, tcRange: '₹42L – ₹90L',  updatedLabel: '2h ago',  benefits: ['ESOP', 'Health insurance', 'Remote'] },
  { name: 'Google',       industry: 'Big Tech',       abbr: 'G',  color: '#3ecfb0', colorBg: 'rgba(62,207,176,0.15)',   entries: 842, tcRange: '₹38L – ₹1.9Cr',updatedLabel: '5h ago',  benefits: ['ESOP', 'Health insurance', 'Dental & vision', '401k', 'Remote', 'Gym'] },
  { name: 'Amazon',       industry: 'E-Commerce',     abbr: 'A',  color: '#e05c7a', colorBg: 'rgba(224,92,122,0.15)',   entries: 785, tcRange: '₹5.6L – ₹1.9Cr',updatedLabel: '12h ago', benefits: ['ESOP', 'Health insurance', 'Dental & vision', 'Relocation', 'Gym'] },
  { name: 'Razorpay',     industry: 'Fintech',        abbr: 'R',  color: '#e89050', colorBg: 'rgba(232,144,80,0.15)',   entries: 302, tcRange: '₹28L – ₹80L',  updatedLabel: '8h ago',  benefits: ['ESOP', 'Health insurance', 'Remote'] },
  { name: 'Microsoft',    industry: 'Big Tech',       abbr: 'M',  color: '#d4a853', colorBg: 'rgba(212,168,83,0.15)',   entries: 612, tcRange: '₹30L – ₹1.4Cr',updatedLabel: '1d ago',  benefits: ['ESOP', 'Health insurance', 'Dental & vision', 'Remote'] },
  { name: 'Flipkart',     industry: 'E-Commerce',     abbr: 'F',  color: '#a08ff0', colorBg: 'rgba(160,144,240,0.15)',  entries: 534, tcRange: '₹24L – ₹1.1Cr',updatedLabel: '3d ago',  benefits: ['ESOP', 'Health insurance'] },
  { name: 'PhonePe',      industry: 'Fintech',        abbr: 'P',  color: '#c07df0', colorBg: 'rgba(192,125,240,0.15)',  entries: 218, tcRange: '₹18L – ₹65L',  updatedLabel: '1d ago',  benefits: ['ESOP', 'Health insurance', 'Dental & vision'] },
  { name: 'Swiggy',       industry: 'Food Tech',      abbr: 'Sw', color: '#d4a853', colorBg: 'rgba(212,168,83,0.15)',   entries: 248, tcRange: '₹20L – ₹80L',  updatedLabel: '2d ago',  benefits: ['ESOP', 'Health insurance'] },
  { name: 'Meesho',       industry: 'E-Commerce',     abbr: 'Me', color: '#3ecfb0', colorBg: 'rgba(62,207,176,0.15)',   entries: 184, tcRange: '₹18L – ₹72L',  updatedLabel: '2d ago',  benefits: ['ESOP', 'Health insurance'] },
  { name: 'CRED',         industry: 'Fintech',        abbr: 'CR', color: '#e05c7a', colorBg: 'rgba(224,92,122,0.15)',   entries: 96,  tcRange: '₹30L – ₹1.1Cr',updatedLabel: '3d ago',  benefits: ['ESOP', 'Remote', 'Gym'] },
  { name: 'Groww',        industry: 'Fintech',        abbr: 'Gr', color: '#a08ff0', colorBg: 'rgba(160,144,240,0.15)',  entries: 168, tcRange: '₹22L – ₹75L',  updatedLabel: '1w ago',  benefits: ['ESOP', 'Health insurance'] },
  { name: 'Zomato',       industry: 'Food Tech',      abbr: 'Zo', color: '#e89050', colorBg: 'rgba(232,144,80,0.15)',   entries: 294, tcRange: '₹18L – ₹70L',  updatedLabel: '1w ago',  benefits: ['ESOP', 'Health insurance'] },
  { name: 'Freshworks',   industry: 'SaaS',           abbr: 'Fr', color: '#3ecfb0', colorBg: 'rgba(62,207,176,0.15)',   entries: 382, tcRange: '₹20L – ₹85L',  updatedLabel: '2w ago',  benefits: ['ESOP', 'Health insurance', 'Remote'] },
  { name: 'Dream11',      industry: 'Gaming',         abbr: 'Dr', color: '#a08ff0', colorBg: 'rgba(160,144,240,0.15)',  entries: 66,  tcRange: '₹28L – ₹90L',  updatedLabel: '1mo ago', benefits: ['ESOP', 'Health insurance', 'Gym'] },
  { name: 'Paytm',        industry: 'Fintech',        abbr: 'Pa', color: '#e89050', colorBg: 'rgba(232,144,80,0.15)',   entries: 316, tcRange: '₹14L – ₹55L',  updatedLabel: '4d ago',  benefits: ['ESOP', 'Health insurance'] },
  { name: 'Zoho',         industry: 'SaaS',           abbr: 'Zh', color: '#c07df0', colorBg: 'rgba(192,125,240,0.15)',  entries: 446, tcRange: '₹12L – ₹42L',  updatedLabel: '2w ago',  benefits: ['Health insurance'] },
  { name: "Byju's",       industry: 'EdTech',         abbr: 'By', color: '#d4a853', colorBg: 'rgba(212,168,83,0.15)',   entries: 228, tcRange: '₹14L – ₹40L',  updatedLabel: '2w ago',  benefits: ['Health insurance'] },
  { name: 'Ola',          industry: 'Mobility',       abbr: 'Ol', color: '#c07df0', colorBg: 'rgba(192,125,240,0.15)',  entries: 142, tcRange: '₹16L – ₹52L',  updatedLabel: '5d ago',  benefits: ['ESOP', 'Health insurance'] },
];

const INDUSTRIES = ['All Industries', ...Array.from(new Set(ALL_COMPANIES.map(c => c.industry))).sort()];

const INDUSTRY_COLORS = {
  'Big Tech': '#3b82f6',
  'E-Commerce': '#e05c7a',
  'Fintech': '#a08ff0',
  'Food Tech': '#f59e0b',
  'Quick Commerce': '#3ecfb0',
  'SaaS': '#06b6d4',
  'EdTech': '#d4a853',
  'Gaming': '#8b5cf6',
  'Mobility': '#e89050',
};

// ── ICONS ─────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const ChevronIcon = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

// ── COMPANY CARD ──────────────────────────────────────────────────────────
function CompanyCard({ company }) {
  const [expanded, setExpanded] = useState(false);
  const visibleBenefits = company.benefits.slice(0, 2);
  const hiddenCount = company.benefits.length - 2;

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e8ecf0',
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Card Header */}
      <div style={{ padding: '16px 16px 12px' }}>
        {/* Top row: logo + info + entry count */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {/* Logo */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: company.colorBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', fontSize: '14px', color: company.color,
            flexShrink: 0, letterSpacing: '0.02em',
          }}>
            {company.abbr}
          </div>

          {/* Name + industry */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', lineHeight: 1.3 }}>
                {company.name}
              </span>
              <span style={{
                fontSize: '11px', fontWeight: '600', color: '#64748b',
                background: '#f1f5f9', borderRadius: '20px', padding: '3px 8px',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {company.entries} entries
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{
                display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                background: INDUSTRY_COLORS[company.industry] || '#94a3b8',
                flexShrink: 0,
              }}/>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                {company.industry}
              </span>
            </div>
          </div>
        </div>

        {/* TC Range pill */}
        <div style={{
          marginTop: '12px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '10px 12px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            TC Range
          </div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>
            {company.tcRange}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px',
              color: '#3b82f6', fontSize: '12px', fontWeight: '600', background: 'none',
              border: 'none', padding: 0, cursor: 'pointer',
            }}
          >
            View breakdown <ChevronIcon open={expanded} />
          </button>
        </div>

        {/* Breakdown (expanded) */}
        {expanded && (
          <div style={{
            marginTop: '8px', padding: '10px 12px',
            background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe',
          }}>
            {[
              { label: 'Base', val: '₹28L – ₹80L', color: '#3b82f6' },
              { label: 'Bonus', val: '₹4L – ₹18L', color: '#8b5cf6' },
              { label: 'Equity', val: '₹10L – ₹92L', color: '#06b6d4' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, display: 'inline-block' }}/>
                  <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>{label}</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#f1f5f9', margin: '0 16px' }} />

      {/* Benefits + Footer */}
      <div style={{ padding: '10px 16px 14px' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Benefits
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {visibleBenefits.map(b => (
            <span key={b} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '20px', padding: '4px 9px',
              fontSize: '11px', fontWeight: '600', color: '#475569',
            }}>
              <span style={{ color: '#22c55e' }}><CheckIcon /></span>
              {b}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span style={{
              fontSize: '11px', fontWeight: '700', color: '#3b82f6', cursor: 'pointer',
            }}>+{hiddenCount} more</span>
          )}
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
            Updated {company.updatedLabel}
          </span>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: '#eff6ff', color: '#3b82f6',
            border: '1px solid #bfdbfe', borderRadius: '8px',
            padding: '7px 12px', fontSize: '12px', fontWeight: '700',
            cursor: 'pointer',
          }}>
            View details <ArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── INDUSTRY FILTER PILL ──────────────────────────────────────────────────
function FilterPill({ label, active, onClick }) {
  const color = INDUSTRY_COLORS[label];
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '7px 13px', borderRadius: '20px', border: 'none',
        background: active ? '#0f172a' : '#ffffff',
        color: active ? '#ffffff' : '#475569',
        fontSize: '12px', fontWeight: '600',
        boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
        border: active ? 'none' : '1px solid #e2e8f0',
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      {color && (
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: active ? 'rgba(255,255,255,0.6)' : color,
          display: 'inline-block', flexShrink: 0,
        }}/>
      )}
      {label === 'All Industries' ? 'All' : label}
    </button>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function BrowseCompanies() {
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All Industries');

  const filtered = useMemo(() => {
    return ALL_COMPANIES.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                         c.industry.toLowerCase().includes(search.toLowerCase());
      const matchInd = industry === 'All Industries' || c.industry === industry;
      return matchSearch && matchInd;
    });
  }, [search, industry]);

  return (
    <div style={{
      maxWidth: '430px', margin: '0 auto',
      minHeight: '100vh', background: '#f5f7fa',
      fontFamily: "'Inter', -apple-system, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* ── STATUS BAR spacer ── */}
      <div style={{ height: '44px', background: '#f5f7fa' }} />

      {/* ── HEADER ── */}
      <div style={{ padding: '4px 20px 20px', background: '#f5f7fa' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Browse <span style={{ color: '#3b82f6' }}>Companies</span>
          </h1>
          <span style={{
            background: '#0f172a', color: '#ffffff',
            fontSize: '12px', fontWeight: '700', borderRadius: '20px',
            padding: '5px 11px', letterSpacing: '0.01em',
          }}>
            {filtered.length} companies
          </span>
        </div>

        {/* Search */}
        <div style={{
          marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px',
          background: '#ffffff', borderRadius: '12px', padding: '11px 14px',
          border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <span style={{ color: '#94a3b8', display: 'flex' }}><SearchIcon /></span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies..."
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '14px', color: '#0f172a', fontFamily: 'inherit',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              background: '#e2e8f0', border: 'none', borderRadius: '50%',
              width: '18px', height: '18px', fontSize: '11px', cursor: 'pointer',
              color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          )}
        </div>

        {/* Filter pills */}
        <div style={{
          marginTop: '12px', display: 'flex', gap: '8px',
          overflowX: 'auto', paddingBottom: '4px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {INDUSTRIES.map(ind => (
            <FilterPill
              key={ind}
              label={ind}
              active={industry === ind}
              onClick={() => setIndustry(ind)}
            />
          ))}
        </div>
      </div>

      {/* ── CARD GRID ── */}
      <div style={{ padding: '0 16px 100px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>No companies found</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Try a different search or filter</div>
          </div>
        ) : (
          filtered.map(company => <CompanyCard key={company.name} company={company} />)
        )}
      </div>
    </div>
  );
}

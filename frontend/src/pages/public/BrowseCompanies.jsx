import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CompanyLogo from '../../components/shared/CompanyLogo';

const PAGE_SIZE = 20;

const INDUSTRY_COLORS = {
  'Big Tech':       '#3b82f6',
  'E-Commerce':     '#e05c7a',
  'Fintech':        '#a08ff0',
  'Food Tech':      '#f59e0b',
  'Quick Commerce': '#3ecfb0',
  'SaaS':           '#06b6d4',
  'EdTech':         '#d4a853',
  'Gaming':         '#8b5cf6',
  'Mobility':       '#e89050',
};

const fmt = (val) => {
  if (!val && val !== 0) return null;
  const l = val / 100000;
  return l >= 100 ? `₹${(l / 100).toFixed(1)}Cr` : `₹${l.toFixed(1)}L`;
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
function CompanyCard({ company, openRoles, onViewRoles }) {
  const [expanded,    setExpanded]    = useState(false);
  const [summary,     setSummary]     = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const tcMin = fmt(company.tcMin);
  const tcMax = fmt(company.tcMax);
  const tcRange = tcMin && tcMax ? `${tcMin} – ${tcMax}` : tcMin || tcMax || '—';

  const benefits = company.benefits ?? [];
  const visibleBenefits = benefits.slice(0, 2);
  const hiddenCount = benefits.length - 2;

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !summary && !loadingSummary) {
      setLoadingSummary(true);
      api.get(`/public/companies/${company.id}/salary-summary`)
        .then(r => setSummary(r.data?.data ?? null))
        .catch(() => setSummary(null))
        .finally(() => setLoadingSummary(false));
    }
  }

  return (
    <div style={{
      background: '#ffffff', borderRadius: '16px',
      border: '1px solid #e8ecf0', overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s',
    }}>
      <style>{`@keyframes rippleStat { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.4); opacity: 0; } }`}</style>
      {/* Card Header */}
      <div style={{ padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {/* Logo */}
          <CompanyLogo
            companyId={company.id}
            companyName={company.name}
            logoUrl={company.logoUrl}
            website={company.website}
            size={44}
            radius={12}
          />

          {/* Name + industry */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', lineHeight: 1.3 }}>
                {company.name}
              </span>
              {company.entryCount > 0 && (
                <span style={{
                  fontSize: '11px', fontWeight: '600', color: '#64748b',
                  background: '#f1f5f9', borderRadius: '20px', padding: '3px 8px',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {company.entryCount} {company.entryCount === 1 ? 'entry' : 'entries'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{
                display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                background: INDUSTRY_COLORS[company.industry] || '#94a3b8', flexShrink: 0,
              }}/>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                {company.industry || 'Other'}
              </span>
            </div>
          </div>
        </div>

        {/* Open roles row — only shown when there are openings */}
        {openRoles > 0 && (
          <button
            onClick={() => onViewRoles(company.name)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', marginTop: '10px',
              padding: '7px 10px', borderRadius: '8px',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              cursor: 'pointer', textAlign: 'left',
            }}
            title={`View ${openRoles} open ${openRoles === 1 ? 'role' : 'roles'} on Opportunities Board`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 8, height: 8, flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', animation: 'rippleStat 1.8s ease-out infinite' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#22c55e', animation: 'rippleStat 1.8s .6s ease-out infinite' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', position: 'relative', zIndex: 1 }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#166534' }}>{openRoles}</span>
              <span style={{ fontSize: '12px', color: '#166534', opacity: 0.8 }}>
                open {openRoles === 1 ? 'role' : 'roles'}
              </span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#166534', opacity: 0.7 }}>
              View →
            </span>
          </button>
        )}

        {/* TC Range pill */}
        <div style={{
          marginTop: '12px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            TC Range
          </div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>
            {tcRange}
          </div>
          {(company.entryCount > 0) && (
            <button
              onClick={toggleExpand}
              style={{
                marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px',
                color: '#3b82f6', fontSize: '12px', fontWeight: '600', background: 'none',
                border: 'none', padding: 0, cursor: 'pointer',
              }}
            >
              View breakdown <ChevronIcon open={expanded} />
            </button>
          )}
        </div>

        {/* Breakdown (expanded) */}
        {expanded && (
          <div style={{
            marginTop: '8px', padding: '10px 12px',
            background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe',
          }}>
            {loadingSummary ? (
              <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '8px 0' }}>Loading…</div>
            ) : summary?.levels?.length > 0 ? (
              summary.levels.map(row => (
                <div key={row.internalLevel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{row.internalLevel}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {row.avgBase   && <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>B {fmt(row.avgBase)}</span>}
                    {row.avgBonus  && <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: '600' }}>Bon {fmt(row.avgBonus)}</span>}
                    {row.avgTC     && <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: '700' }}>{fmt(row.avgTC)} TC</span>}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '8px 0' }}>No breakdown available</div>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#f1f5f9', margin: '0 16px' }} />

      {/* Benefits + Footer */}
      <div style={{ padding: '10px 16px 14px' }}>
        {benefits.length > 0 && (
          <>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Benefits
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {visibleBenefits.map(b => (
                <span key={b.name ?? b} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '20px', padding: '4px 9px',
                  fontSize: '11px', fontWeight: '600', color: '#475569',
                }}>
                  <span style={{ color: '#22c55e' }}><CheckIcon /></span>
                  {b.name ?? b}
                </span>
              ))}
              {hiddenCount > 0 && (
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6' }}>+{hiddenCount} more</span>
              )}
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
            {company.entryCount > 0 ? `${company.entryCount} salary ${company.entryCount === 1 ? 'entry' : 'entries'}` : 'No entries yet'}
          </span>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: '#eff6ff', color: '#3b82f6',
            border: '1px solid #bfdbfe', borderRadius: '8px',
            padding: '7px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          }}>
            View details <ArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FILTER PILL ────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }) {
  const color = INDUSTRY_COLORS[label];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '7px 13px', borderRadius: '20px',
      background: active ? '#0f172a' : '#ffffff',
      color: active ? '#ffffff' : '#475569',
      fontSize: '12px', fontWeight: '600',
      boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
      border: active ? 'none' : '1px solid #e2e8f0',
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
    }}>
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

// ── SKELETON CARD ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, width: '55%', background: '#f1f5f9', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ height: 11, width: '35%', background: '#f1f5f9', borderRadius: 6 }} />
        </div>
      </div>
      <div style={{ marginTop: 12, height: 60, background: '#f8fafc', borderRadius: 10 }} />
      <div style={{ marginTop: 12, height: 1, background: '#f1f5f9' }} />
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        <div style={{ height: 24, width: 70, background: '#f1f5f9', borderRadius: 20 }} />
        <div style={{ height: 24, width: 90, background: '#f1f5f9', borderRadius: 20 }} />
      </div>
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function BrowseCompanies() {
  const navigate = useNavigate();
  const [companies,  setCompanies]  = useState([]);
  const [hiringMap,  setHiringMap]  = useState(new Map());
  const [industries, setIndustries] = useState([]);
  const [search,     setSearch]     = useState('');
  const [industry,   setIndustry]   = useState('');
  const [page,       setPage]       = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore,setLoadingMore]= useState(false);
  const [error,      setError]      = useState(null);
  const debounceRef = useRef(null);

  // Fetch industry list and hiring data once
  useEffect(() => {
    api.get('/public/companies/industries')
      .then(r => setIndustries(r.data?.data ?? []))
      .catch(() => {});
    api.get('/public/companies/hiring-now')
      .then(r => {
        const hMap = new Map();
        for (const item of r.data?.data ?? []) {
          if (item.companyId) hMap.set(String(item.companyId), Number(item.openRoles));
        }
        setHiringMap(hMap);
      })
      .catch(() => {});
  }, []);

  const fetchCompanies = useCallback((pg, searchVal, industryVal, append = false) => {
    if (pg === 0) setLoading(true); else setLoadingMore(true);
    setError(null);
    const params = { page: pg, size: PAGE_SIZE };
    if (searchVal)  params.name     = searchVal;
    if (industryVal) params.industry = industryVal;
    api.get('/public/companies', { params })
      .then(r => {
        const paged = r.data?.data;
        const content = paged?.content ?? [];
        setCompanies(prev => append ? [...prev, ...content] : content);
        setTotalPages(paged?.totalPages ?? 0);
        setTotal(paged?.totalElements ?? 0);
        setPage(pg);
      })
      .catch(() => setError('Failed to load companies. Please try again.'))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, []);

  // Initial load + whenever industry changes
  useEffect(() => {
    setPage(0);
    fetchCompanies(0, search, industry, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      fetchCompanies(0, search, industry, false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function loadMore() {
    fetchCompanies(page + 1, search, industry, true);
  }

  function handleViewRoles(companyName) {
    navigate(`/opportunities?company=${encodeURIComponent(companyName)}`);
  }

  const allIndustries = ['All Industries', ...industries];

  return (
    <div style={{
      maxWidth: '430px', margin: '0 auto',
      minHeight: '100vh', background: '#f5f7fa',
      fontFamily: "'Inter', -apple-system, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div style={{ height: '44px', background: '#f5f7fa' }} />

      {/* Header */}
      <div style={{ padding: '4px 20px 20px', background: '#f5f7fa' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Browse <span style={{ color: '#3b82f6' }}>Companies</span>
          </h1>
          {!loading && (
            <span style={{
              background: '#0f172a', color: '#ffffff',
              fontSize: '12px', fontWeight: '700', borderRadius: '20px',
              padding: '5px 11px', letterSpacing: '0.01em',
            }}>
              {total} {total === 1 ? 'company' : 'companies'}
            </span>
          )}
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

        {/* Industry filter pills */}
        <div style={{
          marginTop: '12px', display: 'flex', gap: '8px',
          overflowX: 'auto', paddingBottom: '4px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {allIndustries.map(ind => (
            <FilterPill
              key={ind}
              label={ind}
              active={ind === 'All Industries' ? !industry : industry === ind}
              onClick={() => setIndustry(ind === 'All Industries' ? '' : ind)}
            />
          ))}
        </div>
      </div>

      {/* Card list */}
      <div style={{ padding: '0 16px 100px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>{error}</div>
            <button
              onClick={() => fetchCompanies(0, search, industry, false)}
              style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
            >
              Retry
            </button>
          </div>
        ) : companies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>No companies found</div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>Try a different search or filter</div>
          </div>
        ) : (
          <>
            {companies.map(company => <CompanyCard key={company.id} company={company} openRoles={hiringMap.get(String(company.id)) ?? 0} onViewRoles={handleViewRoles} />)}

            {/* Load more */}
            {page + 1 < totalPages && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  marginTop: 4, padding: '12px', borderRadius: 12,
                  border: '1px solid #e2e8f0', background: '#fff',
                  fontSize: 13, fontWeight: 600, color: '#3b82f6',
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  opacity: loadingMore ? 0.6 : 1,
                }}
              >
                {loadingMore ? 'Loading…' : `Load more (${total - companies.length} remaining)`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

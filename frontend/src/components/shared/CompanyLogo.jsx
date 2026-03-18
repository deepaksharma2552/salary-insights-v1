import { useState, useEffect } from 'react';

// ── Domain overrides ──────────────────────────────────────────────────────────
const DOMAIN_OVERRIDES = {
  'tcs': 'tcs.com', 'tata consultancy services': 'tcs.com',
  'hcl': 'hcltech.com', 'hcl technologies': 'hcltech.com',
  'wipro': 'wipro.com', 'infosys': 'infosys.com',
  'cognizant': 'cognizant.com', 'tech mahindra': 'techmahindra.com',
  'l&t technology': 'ltts.com', 'mphasis': 'mphasis.com',
  'nagarro': 'nagarro.com', 'epam': 'epam.com',
  'thoughtworks': 'thoughtworks.com', 'publicis sapient': 'publicissapient.com',
  'zepto': 'zeptonow.com', 'zomato': 'zomato.com',
  'swiggy': 'swiggy.com', 'flipkart': 'flipkart.com',
  'meesho': 'meesho.com', 'phonepe': 'phonepe.com',
  'paytm': 'paytm.com', 'razorpay': 'razorpay.com',
  'cred': 'cred.club', 'groww': 'groww.in',
  'zerodha': 'zerodha.com', 'freshworks': 'freshworks.com',
  'zoho': 'zoho.com', "byju's": 'byjus.com', 'byjus': 'byjus.com',
  'unacademy': 'unacademy.com', 'upgrad': 'upgrad.com',
  'ola': 'olacabs.com', 'rapido': 'rapido.bike',
  'nykaa': 'nykaa.com', 'myntra': 'myntra.com',
  'bigbasket': 'bigbasket.com', 'dunzo': 'dunzo.com',
  'dream11': 'dream11.com', 'mpl': 'mpl.live',
  'sharechat': 'sharechat.com', 'dailyhunt': 'dailyhunt.in',
  'inmobi': 'inmobi.com', 'mu sigma': 'mu-sigma.com',
  'browserstack': 'browserstack.com', 'lenskart': 'lenskart.com',
  'google': 'google.com', 'microsoft': 'microsoft.com',
  'amazon': 'amazon.com', 'meta': 'meta.com',
  'apple': 'apple.com', 'netflix': 'netflix.com',
  'uber': 'uber.com', 'linkedin': 'linkedin.com',
  'adobe': 'adobe.com', 'salesforce': 'salesforce.com',
};

export function deriveDomain(name, website) {
  if (website) {
    try {
      const url = website.startsWith('http') ? website : `https://${website}`;
      return new URL(url).hostname.replace(/^www\./, '');
    } catch { /* fall through */ }
  }
  if (!name) return null;
  const key = name.toLowerCase().trim();
  if (DOMAIN_OVERRIDES[key]) return DOMAIN_OVERRIDES[key];
  for (const [k, v] of Object.entries(DOMAIN_OVERRIDES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  const slug = key.replace(/[^a-z0-9]/g, '');
  return slug ? `${slug}.com` : null;
}

// ── Two-layer persistent cache ────────────────────────────────────────────────
// L1: module-level Map — synchronous, zero I/O, lives for the browser session
// L2: localStorage — survives refreshes and new tabs, 30-day TTL
// L3: browser HTTP image cache — free, handled by the browser for all <img> tags
//
// Flow: on module load, L2 is hydrated into L1 (one-time JSON parse).
// All reads are then pure L1 Map lookups. Writes go to both layers atomically.

const LS_KEY    = 'si_logo_cache_v1'; // bump version to bust stale cache
const TTL_MS    = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ENTRIES = 300; // localStorage guard — evict oldest beyond this

// L1 in-memory map: key → { stage: 'clearbit'|'favicon'|'initials', ts: number }
const memCache = new Map();

// Hydrate L1 from L2 once at module load — synchronous, runs before first render
;(function hydrateFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw); // { key: { stage, ts } }
    const now = Date.now();
    for (const [k, v] of Object.entries(stored)) {
      if (v.ts && (now - v.ts) < TTL_MS) {
        memCache.set(k, v);
      }
    }
  } catch { /* localStorage unavailable or corrupt — silent fail */ }
})();

function cacheSet(key, stage) {
  const entry = { stage, ts: Date.now() };
  memCache.set(key, entry);
  // Async write to localStorage — defer to avoid blocking render
  setTimeout(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      stored[key] = entry;
      // Evict oldest entries if over limit
      const entries = Object.entries(stored).sort((a, b) => (a[1].ts ?? 0) - (b[1].ts ?? 0));
      const trimmed = Object.fromEntries(entries.slice(-MAX_ENTRIES));
      localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
    } catch { /* storage full or unavailable — L1 still works */ }
  }, 0);
}

function cacheGet(key) {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) { memCache.delete(key); return null; }
  return entry.stage;
}

// ── CompanyLogo component ─────────────────────────────────────────────────────
/**
 * Priority: logoUrl (DB) → Clearbit → Google favicon → initials
 * Logos are cached persistently in localStorage (30 days) + in-memory.
 * Browser HTTP cache handles the actual image bytes — no re-downloads.
 */
export default function CompanyLogo({
  name, website, logoUrl,
  size = 40, borderRadius = 8,
  color, colorBg, abbr, fontSize = 13,
}) {
  const domain   = logoUrl ? null : deriveDomain(name, website);
  const cacheKey = logoUrl ?? domain ?? name ?? '';

  function resolveInitial() {
    if (logoUrl) return { src: logoUrl, stage: 'logoUrl' };
    if (!domain) return { src: null,    stage: 'initials' };
    const hit = cacheGet(cacheKey);
    if (hit === 'clearbit') return { src: `https://logo.clearbit.com/${domain}`,                       stage: 'clearbit' };
    if (hit === 'favicon')  return { src: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`, stage: 'favicon'  };
    if (hit === 'initials') return { src: null,                                                        stage: 'initials' };
    // Not cached — start with Clearbit (most likely to have a high-quality logo)
    return { src: `https://logo.clearbit.com/${domain}`, stage: 'clearbit' };
  }

  const init = resolveInitial();
  const [src,   setSrc]   = useState(init.src);
  const [stage, setStage] = useState(init.stage);

  // Re-resolve when props change (e.g. navigating between companies)
  useEffect(() => {
    const r = resolveInitial();
    setSrc(r.src);
    setStage(r.stage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, website, logoUrl]);

  const handleError = () => {
    if (stage === 'clearbit' && domain) {
      // Clearbit failed → try Google favicon (virtually never fails)
      cacheSet(cacheKey, 'favicon');
      setSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
      setStage('favicon');
    } else {
      // All sources failed → initials
      cacheSet(cacheKey, 'initials');
      setSrc(null);
      setStage('initials');
    }
  };

  const handleLoad = () => {
    // Cache the winning source so future renders skip failed attempts
    if (stage === 'clearbit' || stage === 'favicon') {
      cacheSet(cacheKey, stage);
    }
  };

  const base = {
    width: size, height: size, borderRadius, flexShrink: 0,
    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: colorBg ?? 'var(--bg-3)', color: color ?? 'var(--text-2)',
  };

  if (src && stage !== 'initials') {
    const isFavicon = stage === 'favicon';
    return (
      <div style={base}>
        <img
          src={src}
          alt={name ?? ''}
          onError={handleError}
          onLoad={handleLoad}
          // loading="lazy" defers off-screen logos — no render blocking
          loading="lazy"
          style={{
            width:      isFavicon ? '60%' : '100%',
            height:     isFavicon ? '60%' : '100%',
            objectFit:  'contain',
            padding:    isFavicon ? 0 : 3,
          }}
        />
      </div>
    );
  }

  // Initials fallback — rendered synchronously, no network required
  return (
    <div style={{ ...base, fontSize, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
      {abbr ?? (name ? name.slice(0, 2).toUpperCase() : '?')}
    </div>
  );
}

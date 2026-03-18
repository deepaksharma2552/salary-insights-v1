import { useState, useEffect } from 'react';

/**
 * CompanyLogo
 *
 * Resolves a company logo using a 4-step waterfall:
 *   1. logoUrl stored in DB (admin-set)
 *   2. Clearbit by domain derived from website field
 *   3. Clearbit by guessed domain from company name  (e.g. "Amazon" → amazon.com)
 *   4. Google Favicon API as last resort
 *   5. Initials avatar fallback (never fails)
 *
 * Results are cached in localStorage under key "logo_cache" as:
 *   { [companyId]: { url: string|null, ts: number } }
 *
 * Cache TTL: 7 days. null means "tried everything, use initials".
 * On cache hit < 7 days old → renders instantly, zero network.
 *
 * Props:
 *   companyId   string   — used as cache key
 *   companyName string   — used for initials fallback + name-based guess
 *   logoUrl     string?  — from DB
 *   website     string?  — from DB
 *   size        number   — px, default 32
 *   radius      number   — border-radius px, default 8
 *   style       object?  — extra styles on the wrapper
 */

const CACHE_KEY = 'logo_cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ── Cache helpers ──────────────────────────────────────────────────────────────

function readCache(companyId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const cache = JSON.parse(raw);
    const entry = cache[companyId];
    if (!entry) return undefined;
    if (Date.now() - entry.ts > CACHE_TTL) return undefined; // stale
    return entry.url; // string (working URL) or null (all failed)
  } catch {
    return undefined;
  }
}

function writeCache(companyId, url) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[companyId] = { url, ts: Date.now() };
    // Prune entries older than TTL to prevent unbounded growth
    const now = Date.now();
    Object.keys(cache).forEach(k => {
      if (now - cache[k].ts > CACHE_TTL) delete cache[k];
    });
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — silent fail, just skip caching
  }
}

// ── URL candidates ─────────────────────────────────────────────────────────────

function extractDomain(website) {
  if (!website) return null;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host || null;
  } catch {
    return null;
  }
}

function nameToGuessedDomain(name) {
  if (!name) return null;
  // Lowercase, strip special chars, collapse spaces → single domain guess
  // "Tata Consultancy Services" → "tataconsultancyservices.com"
  // "Amazon" → "amazon.com"
  // "Infosys BPM" → "infosysbpm.com"
  return name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
}

function getCandidates(logoUrl, website, companyName) {
  const candidates = [];
  if (logoUrl) candidates.push(logoUrl);
  const websiteDomain = extractDomain(website);
  if (websiteDomain) {
    candidates.push(`https://logo.clearbit.com/${websiteDomain}`);
    candidates.push(`https://www.google.com/s2/favicons?domain=${websiteDomain}&sz=64`);
  }
  const guessedDomain = nameToGuessedDomain(companyName);
  if (guessedDomain && guessedDomain !== websiteDomain) {
    candidates.push(`https://logo.clearbit.com/${guessedDomain}`);
    candidates.push(`https://www.google.com/s2/favicons?domain=${guessedDomain}&sz=64`);
  }
  // Deduplicate preserving order
  return [...new Set(candidates)];
}

// ── Initials avatar ────────────────────────────────────────────────────────────

const COLORS = ['#3ecfb0','#d4a853','#e05c7a','#a08ff0','#c07df0','#e89050'];

function getInitialsStyle(name) {
  const idx = name ? name.charCodeAt(0) % COLORS.length : 0;
  const color = COLORS[idx];
  return { color, bg: `${color}26` };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CompanyLogo({
  companyId,
  companyName = '',
  logoUrl,
  website,
  size = 32,
  radius = 8,
  style = {},
}) {
  const abbr    = companyName ? companyName.slice(0, 2).toUpperCase() : '?';
  const colors  = getInitialsStyle(companyName);
  const candidates = getCandidates(logoUrl, website, companyName);

  // resolvedUrl: undefined = loading, null = use initials, string = show image
  const [resolvedUrl, setResolvedUrl] = useState(() => {
    if (!companyId) return null;
    const cached = readCache(companyId);
    // cached === undefined → not in cache yet → start loading
    // cached === null     → all failed before → use initials immediately
    // cached === string   → working URL       → show immediately
    return cached; // may be undefined (triggers effect) or null/string (skips effect)
  });

  const [tryIndex, setTryIndex] = useState(0);

  useEffect(() => {
    // Only run if we don't have a cached result
    if (resolvedUrl !== undefined) return;
    if (candidates.length === 0) {
      setResolvedUrl(null);
      writeCache(companyId, null);
    }
    // tryIndex drives the waterfall — start at 0
    setTryIndex(0);
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleLoad() {
    const url = candidates[tryIndex];
    setResolvedUrl(url);
    writeCache(companyId, url);
  }

  function handleError() {
    const next = tryIndex + 1;
    if (next < candidates.length) {
      setTryIndex(next);
    } else {
      // All candidates exhausted
      setResolvedUrl(null);
      writeCache(companyId, null);
    }
  }

  const wrapperStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  // Show initials (loading state or final fallback)
  if (resolvedUrl === undefined || resolvedUrl === null) {
    return (
      <div style={{
        ...wrapperStyle,
        background: colors.bg,
        color: colors.color,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: Math.max(9, Math.floor(size * 0.34)),
        fontWeight: 600,
      }}>
        {abbr}
        {/* Hidden img probes while showing initials — silent waterfall */}
        {resolvedUrl === undefined && candidates.length > 0 && (
          <img
            key={candidates[tryIndex]}
            src={candidates[tryIndex]}
            alt=""
            onLoad={handleLoad}
            onError={handleError}
            style={{ display: 'none' }}
          />
        )}
      </div>
    );
  }

  // Show resolved logo
  return (
    <div style={{ ...wrapperStyle, background: 'white', padding: 2 }}>
      <img
        src={resolvedUrl}
        alt={companyName}
        onError={() => {
          // Cached URL broke (company rebranded etc.) — clear cache and fall back
          writeCache(companyId, null);
          setResolvedUrl(null);
        }}
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: radius - 2 }}
      />
    </div>
  );
}

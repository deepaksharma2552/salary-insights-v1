import { useState, useEffect, useRef } from 'react';

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
 * Caching — two layers:
 *   1. In-memory Map (module-level): zero-cost on re-renders and same-page duplicates.
 *      Populated from localStorage on first read, stays alive for the session.
 *   2. localStorage under key "logo_cache":
 *      { [companyId]: { url: string|null, ts: number } }
 *      Written only when a URL is newly resolved (not on every read).
 *      TTL: 30 days. null means "tried everything, use initials".
 *      Pruning: lazy (checked on read), not eager (not on every write) — O(1) per op.
 *
 * Props (unchanged from previous version — no breaking changes):
 *   companyId   string   — used as cache key
 *   companyName string   — used for initials fallback + name-based domain guess
 *   logoUrl     string?  — from DB
 *   website     string?  — from DB
 *   size        number   — px, default 32
 *   radius      number   — border-radius px, default 8
 *   style       object?  — extra styles on the wrapper
 */

const CACHE_KEY = 'logo_cache';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days — logos rarely change

// ── In-memory layer — module-level, survives component unmount/remount ─────────
// Map<companyId, string|null>
// string = resolved URL, null = all failed (use initials), undefined = not checked
const memCache = new Map();

// ── localStorage helpers — lazy pruning, write-only when new ──────────────────

function lsRead(companyId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const cache = JSON.parse(raw);
    const entry = cache[companyId];
    if (!entry) return undefined;
    // Lazy TTL check — prune this entry if stale, return undefined to re-resolve
    if (Date.now() - entry.ts > CACHE_TTL) {
      delete cache[companyId];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return undefined;
    }
    return entry.url; // string or null
  } catch {
    return undefined;
  }
}

function lsWrite(companyId, url) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[companyId] = { url, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — in-memory cache still works for session
  }
}

// ── Resolve from cache (memory first, then localStorage) ──────────────────────

function resolveFromCache(companyId) {
  if (!companyId) return null; // no id — skip cache, go straight to initials
  if (memCache.has(companyId)) return memCache.get(companyId); // memory hit
  const lsVal = lsRead(companyId);
  if (lsVal !== undefined) {
    memCache.set(companyId, lsVal); // warm memory cache from ls
    return lsVal;
  }
  return undefined; // not cached — needs waterfall
}

function writeToCache(companyId, url) {
  if (!companyId) return;
  memCache.set(companyId, url);
  lsWrite(companyId, url);
}

// ── URL candidates ─────────────────────────────────────────────────────────────

function extractDomain(website) {
  if (!website) return null;
  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

function nameToGuessedDomain(name) {
  if (!name) return null;
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
  const abbr      = companyName ? companyName.slice(0, 2).toUpperCase() : '?';
  const colors    = getInitialsStyle(companyName);

  // Stable candidate list — only recompute when props change
  const candidatesRef = useRef([]);
  candidatesRef.current = getCandidates(logoUrl, website, companyName);

  // resolvedUrl: undefined = needs waterfall, null = use initials, string = show image
  const [resolvedUrl, setResolvedUrl] = useState(
    () => resolveFromCache(companyId) // sync — no flicker on cache hit
  );
  const [tryIndex, setTryIndex] = useState(0);

  // When companyId changes (e.g. user picks different company in autocomplete)
  // re-check cache for the new id
  useEffect(() => {
    const cached = resolveFromCache(companyId);
    if (cached !== undefined) {
      setResolvedUrl(cached);
      return;
    }
    // Not cached — start waterfall
    setResolvedUrl(undefined);
    setTryIndex(0);
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kick off waterfall when resolvedUrl goes undefined
  useEffect(() => {
    if (resolvedUrl !== undefined) return;
    if (candidatesRef.current.length === 0) {
      setResolvedUrl(null);
      writeToCache(companyId, null);
    }
    // tryIndex=0 triggers the hidden img probe below
  }, [resolvedUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleLoad() {
    const url = candidatesRef.current[tryIndex];
    setResolvedUrl(url);
    writeToCache(companyId, url);
  }

  function handleError() {
    const next = tryIndex + 1;
    if (next < candidatesRef.current.length) {
      setTryIndex(next);
    } else {
      setResolvedUrl(null);
      writeToCache(companyId, null);
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

  // Initials — shown while waterfall runs OR as final fallback
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
        {/* Hidden img probes — silent waterfall while showing initials */}
        {resolvedUrl === undefined && candidatesRef.current.length > 0 && (
          <img
            key={candidatesRef.current[tryIndex]}
            src={candidatesRef.current[tryIndex]}
            alt=""
            onLoad={handleLoad}
            onError={handleError}
            style={{ display: 'none' }}
          />
        )}
      </div>
    );
  }

  // Resolved logo
  return (
    <div style={{ ...wrapperStyle, background: 'white', padding: 2 }}>
      <img
        src={resolvedUrl}
        alt={companyName}
        onError={() => {
          // Cached URL broke (company rebranded etc.) — clear both caches and fall back
          writeToCache(companyId, null);
          setResolvedUrl(null);
        }}
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: radius - 2 }}
      />
    </div>
  );
}

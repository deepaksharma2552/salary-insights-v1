import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * useLocations() — returns all supported Location enum values as option objects.
 *
 * Shape: [{ value: 'BENGALURU', label: 'Bengaluru' }, ...]
 *
 * Fetched from GET /public/locations which is served from the backend's
 * "referenceData" Caffeine cache (24h TTL, evicted on admin writes) — so
 * the backend hit is essentially free after the first request.
 *
 * On the frontend, a module-level promise cache means the network request
 * fires at most once per browser session, even if multiple components call
 * this hook simultaneously on mount. All callers resolve from the same
 * in-flight promise and share the same result.
 *
 * Usage:
 *   const { locations, locationsReady } = useLocations();
 *
 *   // For a filter dropdown with an "All" option:
 *   const options = [{ value: '', label: 'All Locations' }, ...locations];
 *
 *   // For a form select (no "All"):
 *   locations.map(l => <option key={l.value} value={l.value}>{l.label}</option>)
 */

// Module-level promise — survives re-renders and hot reloads within a session.
// Null until the first hook mount triggers the fetch.
let _promise = null;
let _cache   = null; // resolved value stored here so subsequent mounts are synchronous

export function useLocations() {
  const [locations,      setLocations]      = useState(_cache ?? []);
  const [locationsReady, setLocationsReady] = useState(_cache !== null);

  useEffect(() => {
    if (_cache !== null) {
      // Already resolved — nothing to do (state already initialised from _cache above)
      return;
    }

    if (!_promise) {
      _promise = api.get('/public/locations')
        .then(r => {
          _cache = r.data?.data ?? [];
          return _cache;
        })
        .catch(err => {
          console.error('[useLocations] Failed to load locations:', err.message);
          _promise = null; // allow retry on next mount
          return [];
        });
    }

    let cancelled = false;
    _promise.then(data => {
      if (!cancelled) {
        setLocations(data);
        setLocationsReady(true);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { locations, locationsReady };
}

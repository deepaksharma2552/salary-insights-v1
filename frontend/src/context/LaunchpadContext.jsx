import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import api from '../services/api';

/**
 * LaunchpadContext — resources only (bounded admin-curated dataset).
 * Fetched once per session from GET /public/launchpad/resources.
 * Backend serves this from a 6hr Caffeine cache; browser also caches 1hr.
 * Frontend filters client-side — zero API calls per filter change.
 *
 * Experiences are NOT stored here — they are user-generated and unbounded.
 * Each page component fetches experiences independently with cursor pagination.
 */
export const LaunchpadContext = createContext(null);

export function LaunchpadProvider({ children }) {
  const [resources,      setResources]      = useState([]);
  const [stats,          setStats]          = useState(null);
  const [resourcesReady, setResourcesReady] = useState(false);
  const lastFetchRef = useRef(0);

  const loadResources = useCallback((force = false) => {
    // Revalidate at most once every 60 seconds unless forced
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 60_000) return;
    lastFetchRef.current = now;

    api.get('/public/launchpad/resources')
      .then(r => setResources(r.data?.data ?? []))
      .catch(err => { console.error('[LaunchpadContext] resources:', err.message); })
      .finally(() => setResourcesReady(true));

    api.get('/public/launchpad/stats')
      .then(r => setStats(r.data?.data ?? null))
      .catch(() => {});
  }, []);

  // Load on mount
  useEffect(() => { loadResources(true); }, [loadResources]);

  // Revalidate when the tab regains focus (user switches back from admin)
  useEffect(() => {
    function onFocus() { loadResources(false); }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadResources]);

  function getByType(type) {
    return resources.filter(r => r.type === type && r.active);
  }

  function getFiltered(type, difficulty, company) {
    return resources.filter(r => {
      if (!r.active) return false;
      if (type       && r.type       !== type)       return false;
      if (difficulty && r.difficulty !== difficulty) return false;
      if (company    && !(r.companies ?? []).includes(company)) return false;
      return true;
    });
  }

  function allCompanies() {
    const set = new Set();
    resources.forEach(r => (r.companies ?? []).forEach(c => set.add(c)));
    return [...set].sort();
  }

  return (
    <LaunchpadContext.Provider value={{
      resources, stats, resourcesReady,
      getByType, getFiltered, allCompanies,
      reload: () => loadResources(true),
    }}>
      {children}
    </LaunchpadContext.Provider>
  );
}

export function useLaunchpad() {
  return useContext(LaunchpadContext);
}

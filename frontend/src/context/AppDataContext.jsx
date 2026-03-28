import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';

/**
 * AppDataContext — fetches reference data (job functions + levels) once
 * on app startup and makes it available to every component via useAppData().
 *
 * Data is fetched from GET /public/job-functions which is served from a
 * 24-hour Caffeine cache on the backend — single DB hit per day regardless
 * of user volume. Frontend holds the result in React state for the session,
 * so navigation never triggers a re-fetch.
 *
 * Shape of functions:
 *   [{ id, name, displayName, sortOrder, levels: [{ id, name, sortOrder }] }]
 */
export const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [functions,      setFunctions]      = useState([]);
  const [functionsReady, setFunctionsReady] = useState(false);

  const loadFunctions = useCallback(() => {
    api.get('/public/job-functions')
      .then(r => setFunctions(r.data?.data ?? []))
      .catch(err => {
        console.error('[AppDataContext] Failed to load job functions:', err.message);
        setFunctions([]); // fail gracefully — form still works, just no dropdown options
      })
      .finally(() => setFunctionsReady(true));
  }, []);

  useEffect(() => { loadFunctions(); }, [loadFunctions]);

  /**
   * Returns levels for a given function ID.
   * Components call this reactively when the user picks a function.
   */
  function getLevelsForFunction(functionId) {
    if (!functionId) return [];
    const fn = functions.find(f => String(f.id) === String(functionId));
    return fn?.levels ?? [];
  }

  return (
    <AppDataContext.Provider value={{ functions, functionsReady, getLevelsForFunction, reloadFunctions: loadFunctions }}>
      {children}
    </AppDataContext.Provider>
  );
}

/** Convenience hook */
export function useAppData() {
  return useContext(AppDataContext);
}

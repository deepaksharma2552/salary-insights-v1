/**
 * useSalaryEnrichment
 *
 * Loads two datasets in parallel — both are small aggregate payloads
 * (one row per company) and are cached aggressively on the backend:
 *   - /public/companies/hiring-now  → cached 5 min (companyList cache)
 *   - /public/salaries/trends       → cached 1 hour (analytics cache)
 *
 * Returns two Maps keyed by companyId (string) for O(1) lookup in the table.
 *
 * Usage:
 *   const { hiringMap, trendMap } = useSalaryEnrichment();
 *   const openRoles = hiringMap.get(row.companyId);   // number | undefined
 *   const trend     = trendMap.get(row.companyId);    // { direction, pct } | undefined
 */
import { useState, useEffect } from 'react';
import api from '../services/api';

const TREND_THRESHOLD = 0.03; // 3% change = meaningful trend (not noise)

function toTrend(recent, prior) {
  if (!recent || !prior || Number(prior) === 0) return null;
  const r = Number(recent);
  const p = Number(prior);
  const pct = (r - p) / p;
  if (pct > TREND_THRESHOLD)  return { direction: 'up',   pct };
  if (pct < -TREND_THRESHOLD) return { direction: 'down', pct };
  return                               { direction: 'flat', pct };
}

export function useSalaryEnrichment() {
  const [hiringMap, setHiringMap] = useState(new Map());
  const [trendMap,  setTrendMap]  = useState(new Map());

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get('/public/companies/hiring-now').catch(() => null),
      api.get('/public/salaries/trends').catch(() => null),
    ]).then(([hiringRes, trendsRes]) => {
      if (cancelled) return;

      // Build hiring map: companyId → openRoles count
      const hMap = new Map();
      const hiringData = hiringRes?.data?.data ?? [];
      for (const item of hiringData) {
        if (item.companyId) {
          hMap.set(String(item.companyId), Number(item.openRoles));
        }
      }
      setHiringMap(hMap);

      // Build trend map: companyId → { direction, pct }
      const tMap = new Map();
      const trendsData = trendsRes?.data?.data ?? [];
      for (const item of trendsData) {
        if (item.companyId) {
          const t = toTrend(item.recentAvgTc, item.priorAvgTc);
          if (t) tMap.set(String(item.companyId), { ...t, recentCount: item.recentCount });
        }
      }
      setTrendMap(tMap);
    });

    return () => { cancelled = true; };
  }, []);

  return { hiringMap, trendMap };
}

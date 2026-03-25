import { useState, useEffect } from 'react';

/**
 * Returns true when the viewport is <= 768px wide.
 * Uses matchMedia for both the initial value and reactive updates —
 * more reliable than window.innerWidth which can return incorrect values
 * on mobile browsers before layout is complete.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    // matchMedia is the canonical way to check — consistent with CSS media queries
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    // Sync immediately in case initial render was off
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

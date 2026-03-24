import { useState, useEffect } from 'react';

/**
 * Returns true when the viewport is <= 768px wide.
 * Updates reactively on window resize.
 * Used to override inline JSX styles that CSS media-queries can't reach.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}

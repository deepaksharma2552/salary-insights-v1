/**
 * TopProgressBar — a singleton fixed progress bar at the top of the viewport.
 *
 * Usage:
 *   TopProgressBar.start()   — begins crawling animation
 *   TopProgressBar.done()    — snaps to 100% then fades out
 *
 * Automatically triggered on every React Router navigation via the
 * <RouterProgressBar /> component mounted once in App.jsx.
 *
 * Individual pages / modals can also call start/done directly for in-page
 * async actions (e.g. AdminGuideLevels save, tab switch).
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// ── Singleton DOM node ────────────────────────────────────────────────────────
let barEl    = null;
let fillEl   = null;
let timerRef = null;

function ensureBar() {
  if (barEl) return;

  barEl = document.createElement('div');
  barEl.style.cssText = [
    'position:fixed',
    'top:0', 'left:0', 'right:0',
    'height:3px',
    'z-index:99999',
    'pointer-events:none',
    'opacity:0',
    'transition:opacity 0.2s',
    'background:transparent',
  ].join(';');

  fillEl = document.createElement('div');
  fillEl.style.cssText = [
    'height:100%',
    'width:0%',
    'background:linear-gradient(90deg,#38bdf8,#0ea5e9,#38bdf8)',
    'background-size:200% 100%',
    'border-radius:0 99px 99px 0',
    'transition:width 0.1s ease',
    'box-shadow:0 0 8px rgba(14,165,233,0.6)',
  ].join(';');

  barEl.appendChild(fillEl);
  document.body.appendChild(barEl);
}

// ── Public API ────────────────────────────────────────────────────────────────
const TopProgressBar = {
  start() {
    ensureBar();
    clearTimeout(timerRef);

    // Reset
    fillEl.style.transition = 'width 0.1s ease';
    fillEl.style.width      = '0%';
    barEl.style.opacity     = '1';

    // Crawl to ~85% over 2.5s — eases out so it appears to stall while waiting
    requestAnimationFrame(() => {
      fillEl.style.transition = 'width 2.5s cubic-bezier(0.05,0.6,0.4,1)';
      fillEl.style.width      = '85%';
    });
  },

  done() {
    ensureBar();
    clearTimeout(timerRef);

    // Snap to 100%
    fillEl.style.transition = 'width 0.15s ease';
    fillEl.style.width      = '100%';

    // Fade out after fill completes
    timerRef = setTimeout(() => {
      barEl.style.opacity = '0';
      timerRef = setTimeout(() => {
        fillEl.style.transition = 'none';
        fillEl.style.width      = '0%';
      }, 220);
    }, 160);
  },
};

export default TopProgressBar;

// ── Router listener — mount once in App.jsx ───────────────────────────────────
export function RouterProgressBar() {
  const location    = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      TopProgressBar.start();
      prevPathRef.current = location.pathname;
      // Pages render synchronously after navigation — give React one tick
      // to paint the new page then mark done
      const t = setTimeout(() => TopProgressBar.done(), 80);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);

  return null;
}

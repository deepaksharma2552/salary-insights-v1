import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

/**
 * Fire-and-forget page view tracking.
 * Call once at app root — fires on every route change.
 * Errors are silently swallowed — tracking never affects the user.
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    const page = location.pathname;
    // Skip admin pages and auth pages — track public pages only
    if (page.startsWith('/admin') || page.startsWith('/login') ||
        page.startsWith('/register') || page.startsWith('/oauth2')) {
      return;
    }
    api.post('/public/track', null, { params: { page } })
      .catch(() => {}); // silently ignore — tracking must never break the app
  }, [location.pathname]);
}

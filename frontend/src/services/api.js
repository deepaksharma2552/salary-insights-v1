import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // Send the httpOnly auth cookie on every request automatically.
  withCredentials: true,
  // Serialize arrays as repeated params (?locations=Bengaluru&locations=Pune)
  // so Spring's @RequestParam List<String> binds them correctly.
  // Default Axios behaviour adds brackets (?locations[]=…) which Spring ignores.
  paramsSerializer: (params) => {
    const parts = [];
    Object.entries(params).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach(v => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
      } else if (val !== undefined && val !== null) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
      }
    });
    return parts.join('&');
  },
});

// Handle 401 — clear client-side user state and redirect to login.
// The httpOnly cookie is cleared server-side by POST /auth/logout;
// on a 401 the token was already invalid/expired so we just wipe local state.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      // Guard: don't redirect if we're already on /login — prevents infinite redirect loop
      // when a bad login attempt itself returns 401.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    // Log 403s prominently so they're visible in devtools
    if (error.response?.status === 403) {
      console.error('[API] 403 Forbidden —', error.config?.url, '— check that the logged-in user has ADMIN role in the database.');
    }
    return Promise.reject(error);
  }
);

export default api;

  }
  return config;
});

// Handle 401 — clear session and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Guard: don't redirect if we're already on /login — prevents infinite redirect loop
      // when a bad login attempt itself returns 401.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    // Log 403s prominently so they're visible in devtools
    if (error.response?.status === 403) {
      console.error('[API] 403 Forbidden —', error.config?.url, '— check that the logged-in user has ADMIN role in the database.');
    }
    return Promise.reject(error);
  }
);

export default api;

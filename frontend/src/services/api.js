import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
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

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      window.location.href = '/login';
    }
    // Log 403s prominently so they're visible in devtools
    if (error.response?.status === 403) {
      console.error('[API] 403 Forbidden —', error.config?.url, '— check that the logged-in user has ADMIN role in the database.');
    }
    return Promise.reject(error);
  }
);

export default api;

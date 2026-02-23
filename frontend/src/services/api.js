import axios from 'axios';

const API_BASE = '/api';

// Add this helper at the top of api.js or inside the publicApi block
const cleanParams = (params) => {
  if (!params) return {};
  return Object.fromEntries(
    Object.entries(params).filter(([_, value]) => 
      value !== "" && value !== null && value !== undefined
    )
  );
};

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

// ─── Public ────────────────────────────────────────────────────────
export const publicApi = {
  getSalaries: (params) => api.get('/public/salaries', { params: cleanParams(params) }),
  getSalaryById: (id) => api.get(`/public/salaries/${id}`),
  getCompanies: (params) => api.get('/public/companies', { params: cleanParams(params) }),
  getCompanyById: (id) => api.get(`/public/companies/${id}`),
  getIndustries: () => api.get('/public/companies/industries'),
  getAnalyticsByLevel: () => api.get('/public/salaries/analytics/by-level'),
  getAnalyticsByLocation: () => api.get('/public/salaries/analytics/by-location'),
  getAnalyticsByCompany: () => api.get('/public/salaries/analytics/by-company'),
};

// ─── User ───────────────────────────────────────────────────────────
export const userApi = {
  submitSalary: (data) => api.post('/salaries/submit', data),
};

// ─── Admin ─────────────────────────────────────────────────────────
export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/admin/salaries/dashboard'),

  // Companies
  getCompanies: (params) => api.get('/admin/companies', { params: cleanParams(params) }),
  createCompany: (data) => api.post('/admin/companies', data),
  updateCompany: (id, data) => api.put(`/admin/companies/${id}`, data),
  toggleCompanyStatus: (id) => api.patch(`/admin/companies/${id}/toggle-status`),
  deleteCompany: (id) => api.delete(`/admin/companies/${id}`),

  // Salary reviews
  getPendingSalaries: (params) => api.get('/admin/salaries/pending', { params: cleanParams(params) }),
  approveSalary: (id) => api.patch(`/admin/salaries/${id}/approve`),
  rejectSalary: (id, reason) => api.patch(`/admin/salaries/${id}/reject`, { reason }),

  // Levels
  getStandardizedLevels: () => api.get('/admin/levels/standardized'),
  createStandardizedLevel: (data) => api.post('/admin/levels/standardized', data),
  updateStandardizedLevel: (id, data) => api.put(`/admin/levels/standardized/${id}`, data),
  deleteStandardizedLevel: (id) => api.delete(`/admin/levels/standardized/${id}`),
  getCompanyLevels: (companyId) => api.get(`/admin/levels/company/${companyId}`),
  createCompanyLevel: (data) => api.post('/admin/levels/company', data),
  deleteCompanyLevel: (id) => api.delete(`/admin/levels/company/${id}`),
  createMapping: (data) => api.post('/admin/levels/mappings', data),
  deleteMapping: (companyLevelId) => api.delete(`/admin/levels/mappings/company-level/${companyLevelId}`),

  // Audit logs
  getAuditLogs: (params) => api.get('/admin/levels/audit-logs', { params: cleanParams(params) }),
  // AI Refresh
  aiRefreshAll: () => api.post('/admin/ai/refresh'),
  aiRefreshOne: (companyId) => api.post(`/admin/ai/refresh/${companyId}`),
};

export default api;

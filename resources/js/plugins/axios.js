import axios from 'axios';

// Use relative URL since frontend/backend are on same domain
const api = axios.create({
  baseURL: '/api',  // Changed from absolute URL
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: true, // Important for Sanctum
  withXSRFToken: true    // Important for CSRF
});

// Add token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('api_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If impersonating as branch user, restore Company Admin session instead of logging out
      const caToken = localStorage.getItem('ca_token');
      if (caToken) {
        localStorage.setItem('api_token', caToken);
        localStorage.setItem('user', localStorage.getItem('ca_user'));
        localStorage.setItem('user_type', localStorage.getItem('ca_user_type'));
        localStorage.removeItem('ca_token');
        localStorage.removeItem('ca_user');
        localStorage.removeItem('ca_user_type');
        localStorage.removeItem('impersonating_branch');
        localStorage.removeItem('permissions');
        window.location.href = '/company-admin/dashboard';
        return Promise.reject(error);
      }

      // If impersonating as company (SA → Company), restore Super Admin session
      const saToken = localStorage.getItem('sa_token');
      if (saToken) {
        localStorage.setItem('api_token', saToken);
        localStorage.setItem('user', localStorage.getItem('sa_user'));
        localStorage.setItem('user_type', localStorage.getItem('sa_user_type'));
        localStorage.removeItem('sa_token');
        localStorage.removeItem('sa_user');
        localStorage.removeItem('sa_user_type');
        localStorage.removeItem('impersonating');
        localStorage.removeItem('permissions');
        window.location.href = '/super-admin/dashboard';
        return Promise.reject(error);
      }

      // No impersonation — full logout
      localStorage.removeItem('api_token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_type');
      localStorage.removeItem('permissions');
      localStorage.removeItem('sa_token');
      localStorage.removeItem('sa_user');
      localStorage.removeItem('sa_user_type');
      localStorage.removeItem('impersonating');
      localStorage.removeItem('ca_token');
      localStorage.removeItem('ca_user');
      localStorage.removeItem('ca_user_type');
      localStorage.removeItem('impersonating_branch');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
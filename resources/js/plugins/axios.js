// import axios from 'axios';

// // Use relative URL since frontend/backend are on same domain
// const api = axios.create({
//   baseURL: '/api',  // Changed from absolute URL
//   headers: {
//     Accept: 'application/json',
//     'X-Requested-With': 'XMLHttpRequest'
//   },
//   withCredentials: true, // Important for Sanctum
//   withXSRFToken: true    // Important for CSRF
// });

// // Add token interceptor
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('api_token');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// // Add response interceptor for handling auth errors
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       const caToken = localStorage.getItem('ca_token');
//       if (caToken) {
//         localStorage.setItem('api_token', caToken);
//         localStorage.setItem('user', localStorage.getItem('ca_user'));
//         localStorage.setItem('user_type', localStorage.getItem('ca_user_type'));
//         localStorage.removeItem('ca_token');
//         localStorage.removeItem('ca_user');
//         localStorage.removeItem('ca_user_type');
//         localStorage.removeItem('impersonating_branch');
//         localStorage.removeItem('permissions');
//         window.location.href = '/company-admin/dashboard';
//         return Promise.reject(error);
//       }

//       localStorage.removeItem('api_token');
//       localStorage.removeItem('user');
//       localStorage.removeItem('user_type');
//       localStorage.removeItem('permissions');
//       localStorage.removeItem('ca_token');
//       localStorage.removeItem('ca_user');
//       localStorage.removeItem('ca_user_type');
//       localStorage.removeItem('impersonating_branch');
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;

import axios from 'axios';

// Use relative URL since frontend/backend are on same domain
const api = axios.create({
  baseURL: '/api',
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

// Add response interceptor - just log errors, don't auto-redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if we should handle 401
    const isLoginRequest = error.config?.url?.includes('/login');
    const isPublicEndpoint = error.config?.url?.includes('/public') || 
                            error.config?.url?.includes('/welcome');
    
    // Don't handle 401 for login attempts or public endpoints
    if (isLoginRequest || isPublicEndpoint) {
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/login' ||
                         window.location.pathname === '/';

      if (!isLoginPage) {
        const caToken = localStorage.getItem('ca_token');
        if (caToken) {
          localStorage.setItem('api_token', caToken);
          localStorage.setItem('user', localStorage.getItem('ca_user') || '');
          localStorage.setItem('user_type', localStorage.getItem('ca_user_type') || '');
          localStorage.removeItem('ca_token');
          localStorage.removeItem('ca_user');
          localStorage.removeItem('ca_user_type');
          localStorage.removeItem('impersonating_branch');
          localStorage.removeItem('permissions');
          window.location.href = '/company-admin/dashboard';
          return Promise.reject(error);
        }

        localStorage.removeItem('api_token');
        localStorage.removeItem('user');
        localStorage.removeItem('user_type');
        localStorage.removeItem('permissions');
        localStorage.removeItem('ca_token');
        localStorage.removeItem('ca_user');
        localStorage.removeItem('ca_user_type');
        localStorage.removeItem('impersonating_branch');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
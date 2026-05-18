import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/',
  withCredentials: true, // send cookies (required for Sanctum cookie auth)
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
});

// Add token to requests if using token-based auth
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('api_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token for non-GET requests
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
      config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    if (status === 401 || status === 419) {
      // session expired / unauthorized → clear frontend state and redirect to login
      localStorage.removeItem('api_token');
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
      localStorage.removeItem('user_type');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default http;
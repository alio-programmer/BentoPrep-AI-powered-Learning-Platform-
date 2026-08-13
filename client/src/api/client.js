import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const token = localStorage.getItem('pp_token');
      const onAuthPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/register');
      if (token && !onAuthPage) {
        localStorage.removeItem('pp_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Return a readable error string from an axios error. Never yields an object,
// so UI can safely show the result (e.g. "Failed to generate roadmap.").
export function errorMessage(err, fallback = 'Something went wrong.') {
  const data = err?.response?.data;
  const raw = data && typeof data === 'object' ? data.error : data;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (err?.message && err.message !== 'Network Error') return err.message;
  return fallback;
}

export default api;

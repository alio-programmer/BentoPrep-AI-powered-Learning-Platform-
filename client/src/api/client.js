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

export default api;

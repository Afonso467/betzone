import axios from 'axios';

// Cliente Axios — injeta automaticamente o token JWT (login de utilizador)
// e a password de admin (painel /admin), quando existirem.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const adminPassword = sessionStorage.getItem('nc_admin_password');
  if (adminPassword) config.headers['x-admin-password'] = adminPassword;

  return config;
});

// Trata erros globais — 401 (sessão inválida/expirada) faz logout automático
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      console.error('Erro de rede — verifica se o backend está a correr.');
    } else if (err.response.status === 401 && !err.config.url.includes('/admin')) {
      // Não desloga em erros 401 vindos do painel de admin (password errada
      // do admin não deve afetar a sessão normal do utilizador)
      localStorage.removeItem('nc_token');
      localStorage.removeItem('nc_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

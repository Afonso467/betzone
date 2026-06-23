import axios from 'axios';

// Cliente Axios — sem autenticação de utilizador, todas as rotas públicas
// são abertas. As rotas /admin/* exigem a password guardada em sessionStorage
// (definida ao entrar no painel de administração).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const adminPassword = sessionStorage.getItem('nc_admin_password');
  if (adminPassword) config.headers['x-admin-password'] = adminPassword;
  return config;
});

// Trata erros globais e mostra mensagem amigável na consola
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      console.error('Erro de rede — verifica se o backend está a correr.');
    }
    return Promise.reject(err);
  }
);

export default api;

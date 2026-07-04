import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Restaurar sessão a partir do localStorage e validar o token com o servidor
  useEffect(() => {
    const token = localStorage.getItem('nc_token');
    const stored = localStorage.getItem('nc_user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch (_) {}
    }
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => {
          setUser(data.user);
          localStorage.setItem('nc_user', JSON.stringify(data.user));
        })
        .catch(() => {
          localStorage.removeItem('nc_token');
          localStorage.removeItem('nc_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('nc_token', data.token);
    localStorage.setItem('nc_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    localStorage.setItem('nc_token', data.token);
    localStorage.setItem('nc_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nc_token');
    localStorage.removeItem('nc_user');
    setUser(null);
  }, []);

  // 🛠️ ADICIONADO: Mutação direta e instantânea de pontos sem requisições HTTP adicionais
  const updatePoints = useCallback((newPoints) => {
    if (newPoints === undefined || newPoints === null) return;
    setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, points: Number(newPoints) };
      localStorage.setItem('nc_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  // Atualiza pontos/xp/etc. a partir do backend
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/state');
      if (data.user)    { setUser(data.user); localStorage.setItem('nc_user', JSON.stringify(data.user)); }
      if (data.history) setHistory(data.history);
    } catch (_) {
      // se a sessão tiver expirado, o interceptor do axios já trata do logout/redirect
    }
  }, []);

  return (
    // 🛠️ Incluído o updatePoints no Provider para os componentes dos jogos usarem
    <AuthCtx.Provider value={{ user, history, loading, login, register, logout, refresh, updatePoints }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useGame = () => useContext(AuthCtx);
export const useAuth = () => useContext(AuthCtx);
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const GameCtx = createContext(null);

// Estado do utilizador demo — carregado do backend, sem login
// Moeda única da plataforma: PONTOS (sem saldo monetário/€)
const DEFAULT_USER = {
  id: 1, username: 'GamerPro', avatar: '🎮',
  points: 18900, xp: 3450, xp_next: 5000, level: 12,
  wins: 147, losses: 63,
};

export function GameProvider({ children }) {
  const [user,    setUser]    = useState(DEFAULT_USER);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carrega estado do backend (pontos, xp, etc.)
  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/games/state');
      if (data.user)    setUser(data.user);
      if (data.history) setHistory(data.history);
    } catch (_) {
      // Se o backend não estiver ligado usa os valores demo
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Atualização otimista dos pontos (sem esperar pelo servidor)
  const updatePoints = useCallback((newPoints) => {
    setUser(u => ({ ...u, points: newPoints }));
  }, []);

  return (
    <GameCtx.Provider value={{ user, history, loading, refresh, updatePoints }}>
      {children}
    </GameCtx.Provider>
  );
}

export const useGame = () => useContext(GameCtx);

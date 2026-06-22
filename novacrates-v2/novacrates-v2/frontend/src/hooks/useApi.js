import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

// Hook genérico para fetch de dados com loading/error/refetch
export function useApi(endpoint, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(endpoint);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [endpoint, ...deps]); // eslint-disable-line

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// Hook para mutações (POST/PUT/DELETE) com estado de carregamento
export function useMutation(method = 'post') {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const mutate = useCallback(async (endpoint, body) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api[method](endpoint, body);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro inesperado';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [method]);

  return { mutate, loading, error };
}

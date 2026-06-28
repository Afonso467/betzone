import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useGame } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { Card, Button, Badge, Spinner } from '../components/ui';
import { formatPoints, formatNumber } from '../utils/constants';
import api from '../utils/api';

// Fallback caso o backend não esteja disponível ainda
const DEMO_CASES = [
  { id: 1, name: 'Nova Case',    description: 'A caixa inicial, ideal para começar.',         price: 250,  emoji: '📦', theme_color: '#F59E0B' },
  { id: 2, name: 'Premium Case', description: 'Itens de melhor qualidade.',                    price: 500,  emoji: '🎁', theme_color: '#8b5cf6' },
  { id: 3, name: 'Galaxy Case',  description: 'Tema espacial com recompensas maiores.',         price: 1000, emoji: '🌌', theme_color: '#3b82f6' },
  { id: 4, name: 'Mythic Case',  description: 'A caixa mais exclusiva da plataforma.',          price: 2000, emoji: '🏆', theme_color: '#ffd700' },
];

export default function Loja() {
  const { user, refresh } = useGame();
  const { data, loading } = useApi('/store');
  const [buying, setBuying] = useState({});

  const cases = data?.cases?.length ? data.cases : DEMO_CASES;

  // Comprar caixa diretamente pela loja (mesmo endpoint do Case Opening)
  const buyCase = async (c) => {
    setBuying(b => ({ ...b, [c.id]: true }));
    try {
      const { data } = await api.post('/games/cases/open', { caseId: c.id });
      toast.success(`📦 ${data.item.name} → +${data.pointsWon} pontos!`);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao abrir a caixa');
    } finally {
      setBuying(b => ({ ...b, [c.id]: false }));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">🏪 Loja</h1>
        <p className="text-text2 text-sm mt-1">Usa os teus pontos para abrir caixas e ganhar itens</p>
      </div>

      {/* Saldo de pontos em destaque */}
      <Card className="mb-6 border-border2" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,.06), var(--bg3))' }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl flex-shrink-0">💎</span>
          <div>
            <div className="font-bold text-sm">O teu saldo</div>
            <div className="text-orange font-black text-lg">{formatNumber(user?.points || 0)} pontos</div>
          </div>
        </div>
      </Card>

      {/* Caixas disponíveis */}
      <h2 className="font-bold text-base mb-3">📦 Caixas Disponíveis</h2>
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cases.map((c, i) => (
            <motion.div key={c.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="text-center">
                <div className="text-4xl mb-2 mt-1">{c.emoji}</div>
                <div className="font-bold text-sm mb-1">{c.name}</div>
                <p className="text-text2 text-xs mb-3 leading-relaxed">{c.description}</p>
                <div className="text-xl font-black text-orange mb-3">{formatPoints(c.price)}</div>
                <Button className="w-full" size="sm" onClick={() => buyCase(c)} loading={buying[c.id]}
                  disabled={(user?.points || 0) < c.price}>
                  {(user?.points || 0) < c.price ? 'Pontos insuficientes' : 'Abrir Caixa'}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <p className="text-text3 text-xs text-center mt-8">
        💡 Os itens das caixas são cosméticos — o ganho real é em pontos, mostrado após cada abertura.
      </p>
    </div>
  );
}

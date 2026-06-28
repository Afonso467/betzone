import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApi } from '../hooks/useApi';
import { useGame } from '../context/AuthContext';
import { Card, Badge, Button } from '../components/ui';
import { timeLeft, formatPoints } from '../utils/constants';
import api from '../utils/api';

export default function Giveaways() {
  const { refresh } = useGame();
  const { data, refetch } = useApi('/giveaways');
  const [entering, setEntering] = useState({});

  const giveaways = data?.giveaways || [];

  const enter = async (id) => {
    setEntering(e => ({ ...e, [id]: true }));
    try {
      await api.post(`/giveaways/${id}/enter`);
      toast.success('🎁 Inscrito! Boa sorte!');
      await refresh();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao participar');
    } finally {
      setEntering(e => ({ ...e, [id]: false }));
    }
  };

  // Fallback demo data when API is unavailable
  const DEMO = [
    { id: 1, title: 'AK-47 | Redline FT',     emoji: '🔫', category: 'Skin',      value: 1200,  participant_count: 1240, ends_at: new Date(Date.now()+5*86400000).toISOString(), entered: false },
    { id: 2, title: '5.000 Pontos NovaCrates', emoji: '🎁', category: 'Pontos',    value: 5000,  participant_count: 3890, ends_at: new Date(Date.now()+3*86400000).toISOString(), entered: true  },
    { id: 3, title: 'Butterfly Knife Doppler', emoji: '🔥', category: 'Skin Rara', value: 12000, participant_count: 567,  ends_at: new Date(Date.now()+10*86400000).toISOString(),entered: false },
    { id: 4, title: '20.000 Pontos NovaCrates',emoji: '💎', category: 'Pontos',    value: 20000, participant_count: 6120, ends_at: new Date(Date.now()+2*86400000).toISOString(), entered: false },
  ];

  const items = giveaways.length > 0 ? giveaways : DEMO;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">🎁 Giveaways</h1>
        <p className="text-text2 text-sm mt-1">Participa nos sorteios e ganha prémios exclusivos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((g, i) => (
          <motion.div key={g.id}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card className="overflow-hidden p-0">
              <div className="h-20 flex items-center justify-center text-4xl"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,.08), rgba(245,158,11,.03))' }}>
                {g.emoji}
              </div>
              <div className="p-4">
                <Badge color="orange" className="mb-2">{g.category}</Badge>
                <div className="font-bold text-sm mb-1 leading-snug">{g.title}</div>
                {g.value > 0 && (
                  <div className="text-orange font-bold text-sm mb-2">{formatPoints(g.value)}</div>
                )}
                <div className="text-xs text-orange font-semibold mb-1">
                  ⏰ {timeLeft(g.ends_at)}
                </div>
                <div className="text-xs text-text2 mb-3">
                  👥 {g.participant_count?.toLocaleString('pt-PT')} participantes
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-border rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-orange rounded-full"
                    style={{ width: `${Math.min(100, (g.participant_count / 10000) * 100)}%` }} />
                </div>

                {g.entered ? (
                  <button disabled
                    className="w-full py-2 rounded-[10px] text-xs font-bold bg-success/10 text-success border border-success/20 cursor-default">
                    ✅ Inscrito
                  </button>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => enter(g.id)} loading={entering[g.id]}>
                    🎁 Participar
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

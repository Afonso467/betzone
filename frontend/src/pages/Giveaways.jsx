import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Gift, Clock } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useGame } from '../context/AuthContext';
import { Card, Badge, Button } from '../components/ui';
import { timeLeft, formatPoints } from '../utils/constants';
import api from '../utils/api';

// ── Botão de resgate de pontos grátis (a cada 5 minutos) ─────────────────────
function FreeClaimCard() {
  const { refresh } = useGame();
  const [status, setStatus]   = useState(null); // { available, secondsLeft, amount }
  const [claiming, setClaiming] = useState(false);
  const intervalRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/giveaways/claim-status');
      setStatus(data);
    } catch (_) {}
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Contagem decrescente local — atualiza a cada segundo sem pedir ao servidor
  useEffect(() => {
    if (!status || status.available) return;
    intervalRef.current = setInterval(() => {
      setStatus(s => {
        if (!s || s.secondsLeft <= 1) {
          clearInterval(intervalRef.current);
          return { ...s, available: true, secondsLeft: 0 };
        }
        return { ...s, secondsLeft: s.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [status?.available]);

  const claim = async () => {
    setClaiming(true);
    try {
      const { data } = await api.post('/giveaways/claim');
      toast.success(data.message);
      await refresh();
      loadStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao resgatar');
      loadStatus(); // sincroniza com o servidor, caso o cooldown local esteja dessincronizado
    } finally {
      setClaiming(false);
    }
  };

  if (!status) return null;

  const mm = String(Math.floor(status.secondsLeft / 60)).padStart(2, '0');
  const ss = String(status.secondsLeft % 60).padStart(2, '0');

  return (
    <Card className="mb-6 overflow-hidden p-0 border-orange/30">
      <div className="flex items-center gap-4 p-5" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,.10), rgba(245,158,11,.02))' }}>
        <div className="w-14 h-14 rounded-2xl bg-orange/15 border border-orange/30 flex items-center justify-center flex-shrink-0">
          <Gift size={26} className="text-orange" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-base">🎁 Pontos Grátis</div>
          <p className="text-text2 text-xs mt-0.5">
            Resgata {formatPoints(status.amount)} a cada {status.cooldownMinutes} minutos — é só clicar!
          </p>
        </div>
        <div className="flex-shrink-0">
          <AnimatePresence mode="wait">
            {status.available ? (
              <motion.div key="available" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Button onClick={claim} loading={claiming} className="px-6 py-3">
                  🎁 Resgatar Agora
                </Button>
              </motion.div>
            ) : (
              <motion.div key="cooldown" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 bg-bg4 border border-border2 rounded-[10px] px-5 py-3 text-text2">
                <Clock size={15} />
                <span className="font-mono font-bold text-sm tabular-nums">{mm}:{ss}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  );
}

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

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">🎁 Giveaways</h1>
        <p className="text-text2 text-sm mt-1">Participa nos sorteios e ganha prémios exclusivos</p>
      </div>

      <FreeClaimCard />

      {giveaways.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">🎁</div>
          <p className="text-text2 text-sm">Não há giveaways ativos no momento.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {giveaways.map((g, i) => (
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
      )}
    </div>
  );
}

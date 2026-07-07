import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useGame } from '../../context/AuthContext';
import { Button, Card, Input, Select, Badge, Spinner } from '../ui';
import { formatPoints, RARITY_COLORS, RARITY_BG } from '../../utils/constants';
import { Plane, Rocket, DollarSign, Shield, Zap, ArrowDown, ArrowUp, Coins, Trophy } from 'lucide-react';

// ── MINES ────────────────────────────────────────────────────────────────────
export function MinesGame() {
  // 🛠️ ADICIONADO: updatePoints injetado
  const { refresh, updatePoints } = useGame();
  const [bet, setBet]   = useState(50);
  const [mines, setMines] = useState(3);
  const [sessionId, setSessionId] = useState(null);
  const [revealed, setRevealed]   = useState([]);
  const [minePositions, setMinePositions] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [potentialWin, setPotentialWin] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | playing | won | lost

  const startGame = async () => {
    try {
      const { data } = await api.post('/games/mines/start', { betPoints: bet, mineCount: mines });
      
      // 🔥 ATUALIZAÇÃO: Deduz o saldo instantaneamente na UI
      updatePoints(data.points);

      setSessionId(data.sessionId);
      setRevealed([]);
      setMinePositions([]);
      setMultiplier(1);
      setPotentialWin(bet);
      setStatus('playing');
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
  };

  const clickCell = async (idx) => {
    if (status !== 'playing' || revealed.includes(idx)) return;
    try {
      const { data } = await api.post('/games/mines/reveal', { sessionId, cellIndex: idx });
      if (data.hit) {
        setMinePositions(data.minePositions);
        setStatus('lost');
        toast.error('💥 Mina encontrada!');
        
        // 🔥 ATUALIZAÇÃO: Garante o saldo correto de derrota sincronizado
        updatePoints(data.points);
        refresh();
      } else {
        setRevealed(data.revealed);
        setMultiplier(data.multiplier);
        setPotentialWin(data.potentialWin);
        toast.success(`💎 +${data.multiplier}x`, { duration: 1000 });
        
        // 🔥 ATUALIZAÇÃO: Atualiza se houver ganhos parciais/segurança
        updatePoints(data.points);
      }
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
  };

  const cashout = async () => {
    if (status !== 'playing' || !revealed.length) return;
    try {
      const { data } = await api.post('/games/mines/cashout', { sessionId });
      toast.success(`💰 Cashout: ${formatPoints(data.winPoints)} (${data.multiplier}x)!`);
      setStatus('won');
      
      // 🔥 ATUALIZAÇÃO: Adiciona o prémio massivo na hora ao saldo visível
      updatePoints(data.points);
      refresh();
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
  };

  const reset = () => { setSessionId(null); setRevealed([]); setMinePositions([]); setMultiplier(1); setStatus('idle'); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <h3 className="font-bold mb-5">⚙️ Configuração</h3>
        <Input label="💎 Aposta (pts)" type="number" min="1" step="1"
          value={bet} onChange={e => setBet(+e.target.value)} disabled={status === 'playing'} />
        <Select label="💣 Número de minas" value={mines}
          onChange={e => setMines(+e.target.value)} disabled={status === 'playing'}>
          {[1,2,3,5,10,15,20].map(n => <option key={n} value={n}>{n} minas</option>)}
        </Select>
        <div className="text-center py-4">
          <p className="text-xs text-text2 mb-1">Multiplicador atual</p>
          <motion.div
            key={multiplier}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-4xl font-black text-orange tracking-tight"
          >
            {multiplier.toFixed(2)}x
          </motion.div>
          {status === 'playing' && revealed.length > 0 && (
            <p className="text-success text-sm mt-1">Ganho potencial: {formatPoints(potentialWin)}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {status === 'idle' && <Button onClick={startGame} className="w-full py-3">🎮 Iniciar Jogo</Button>}
          {status === 'playing' && (
            <Button onClick={cashout} disabled={!revealed.length} className="w-full py-3"
              style={{ background: 'var(--green)', color: '#fff' }}>
              💵 Cashout — {formatPoints(potentialWin)}
            </Button>
          )}
          {(status === 'won' || status === 'lost') && (
            <Button variant="secondary" onClick={reset} className="w-full py-3">🔄 Jogar Novamente</Button>
          )}
        </div>
        {status === 'lost' && <div className="mt-3 p-3 rounded-lg bg-red/10 text-red text-center text-sm font-semibold">💥 Explodiste!</div>}
        {status === 'won'  && <div className="mt-3 p-3 rounded-lg bg-success/10 text-success text-center text-sm font-semibold">🎉 Cashout com sucesso!</div>}
      </Card>

      <Card>
        <h3 className="font-bold mb-4">Grid de Jogo</h3>
        <div className="grid grid-cols-5 gap-2">
          {Array(25).fill(null).map((_, i) => {
            const isRevealed = revealed.includes(i);
            const isMine = minePositions.includes(i);
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.92 }}
                onClick={() => clickCell(i)}
                className={`aspect-square rounded-[10px] flex items-center justify-center text-xl transition-all border
                  ${isMine ? 'bg-red/10 border-red' :
                    isRevealed ? 'bg-success/10 border-success cursor-default' :
                    status === 'playing' ? 'bg-bg4 border-border2 hover:border-orange hover:bg-orange/5' :
                    'bg-bg4 border-border cursor-default opacity-60'}`}
              >
                {isMine ? '💣' : isRevealed ? '💎' : ''}
              </motion.button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── COINFLIP ─────────────────────────────────────────────────────────────────
export function CoinflipGame() {
  // 🛠️ ADICIONADO: updatePoints injetado
  const { user, refresh, updatePoints } = useGame();
  const [bet, setBet] = useState(50);
  const [choice, setChoice] = useState(null);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState(null);
  
  const [visualFace, setVisualFace] = useState('heads'); 

 const flip = async () => {
    if (!choice) return toast.error('Escolhe Cara ou Coroa');
    if (!user) return toast.error('Erro ao carregar dados do utilizador');
    if (user.points < bet) return toast.error('Saldo insuficiente');
    
    // 🛠️ 1. FORÇA A DEDUÇÃO IMEDIATA LOCAL ANTES DE TUDO
    // Isto roda antes da chamada de rede para garantir que os pontos somem na hora
    updatePoints(user.points - bet);
    
    setFlipping(true);
    setResult(null);

    const faceInterval = setInterval(() => {
      setVisualFace(prev => (prev === 'heads' ? 'tails' : 'heads'));
    }, 150);

    try {
      // 🛠️ 2. AGUARDA O SERVIDOR EM BACKGROUND
      const { data } = await api.post('/games/coinflip', { betPoints: bet, choice });
      
      // 🛠️ 3. REVELAÇÃO CONTROLADA (SÓ NO FIM DA ANIMAÇÃO)
      setTimeout(async () => {
        clearInterval(faceInterval);
        setVisualFace(data.result);
        setResult(data);
        setFlipping(false);
        
        // Só aqui, após os 900ms, é que o saldo final (com a vitória somada) entra
        updatePoints(data.points);
        await refresh();
        
        if (data.won) toast.success(`🎉 Ganhastes! +${formatPoints(data.winPoints)}`);
        else toast.error(`😢 Perdeste ${formatPoints(bet)}`);
      }, 900); // Se achares 900ms muito rápido, podes aumentar para 1200 ou 1500

    } catch (err) {
      clearInterval(faceInterval);
      setFlipping(false);
      // Rollback imediato se o servidor rejeitar a aposta
      refresh();
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="text-center">
        <motion.div
          animate={flipping ? { 
            rotateY: [0, 180, 360, 540, 720],
            scale: [1, 1.15, 1.2, 1.05, 1]
          } : {}}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          className="w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl border-4 select-none shadow-lg"
          style={{
            background: visualFace === 'heads' 
              ? 'linear-gradient(135deg, #d4af37, #f5d563)' 
              : 'linear-gradient(135deg, #6b7280, #9ca3af)',
            borderColor: visualFace === 'heads' ? '#d4af37' : '#6b7280',
          }}
        >
          {visualFace === 'heads' ? '👑' : '🦅'}
        </motion.div>

        <div className="flex gap-3 justify-center mb-5">
          {[
            { id: 'heads', icon: '👑', label: 'Cara' },
            { id: 'tails', icon: '🦅', label: 'Coroa' }
          ].map(c => (
            <button 
              key={c.id} 
              onClick={() => !flipping && setChoice(c.id)}
              disabled={flipping}
              className={`flex-1 py-3 rounded-[10px] font-bold border-2 text-sm transition-all
                ${choice === c.id 
                  ? 'border-orange bg-orange/10 text-orange' 
                  : 'border-border2 bg-bg4 hover:border-border text-text2'} 
                ${flipping ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        <Input 
          label="💎 Aposta (pts)" 
          type="number" 
          min="1" 
          step="1" 
          value={bet}
          onChange={e => setBet(+e.target.value)} 
          disabled={flipping} 
        />
        
        <Button 
          onClick={flip} 
          loading={flipping} 
          disabled={!choice || flipping} 
          className="w-full py-3 mt-4 font-bold tracking-wide"
        >
          🎯 Lançar Moeda
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mt-4 p-3 rounded-[10px] font-bold border ${
                result.won 
                  ? 'bg-success/10 text-success border-success/20' 
                  : 'bg-red/10 text-red border-red/20'
              }`}
            >
              {result.won ? `🎉 Ganhastes ${formatPoints(result.winPoints)}!` : `😢 Perdeste ${formatPoints(bet)}`}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

// ── CRASH ─────────────────────────────────────────────────────────────────────
export function CrashGame() {
  // 🛠️ ADICIONADO: updatePoints injetado
  const { refresh, updatePoints } = useGame();
  const [bet, setBet]       = useState(50);
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(null);
  const [running, setRunning]   = useState(false);
  const [crashed, setCrashed]   = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [betIn, setBetIn]       = useState(false);
  const [history, setHistory]   = useState([1.23, 3.45, 1.01, 8.92, 2.11, 1.54, 26.06, 3.77]);
  const intervalRef = useRef(null);
  const canvasRef   = useRef(null);
  const progressRef = useRef(0);

  const draw = (progress, didCrash, didCashout) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0615');
    bg.addColorStop(1, '#120a1e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + 11) % W);
      const sy = ((i * 97 + 31) % H);
      ctx.fillRect(sx, sy, i % 3 === 0 ? 1.5 : 0.8, i % 3 === 0 ? 1.5 : 0.8);
    }

    const p = Math.min(progress, 1);
    const startX = 60, startY = H - 40;
    const endX = startX + (W - 80) * p;
    const endY = startY - (H - 80) * Math.pow(p, 0.7);

    const cpX = startX + (endX - startX) * 0.3;
    const cpY = startY;

    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, 'rgba(245,158,11,0)');
    grad.addColorStop(1, didCrash ? 'rgba(239,68,68,0.25)' : didCashout ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.2)');
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.lineTo(endX, startY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    const lineColor = didCrash ? '#ef4444' : didCashout ? '#10b981' : '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (!didCrash) {
      const angle = Math.atan2(startY - endY, endX - startX);
      ctx.save();
      ctx.translate(endX, endY);
      ctx.rotate(-angle);
      ctx.font = '28px serif';
      ctx.fillText('✈️', -14, 10);
      ctx.restore();
      for (let t = 0; t < 6; t++) {
        const tp = Math.max(0, p - t * 0.015);
        const tx2 = startX + (W - 80) * tp;
        const ty2 = startY - (H - 80) * Math.pow(tp, 0.7);
        const alpha = (6 - t) / 10;
        ctx.beginPath();
        ctx.arc(tx2 - 6, ty2, 3 - t * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,158,11,${alpha})`;
        ctx.fill();
      }
    } else {
      ctx.font = '32px serif';
      ctx.fillText('💥', endX - 16, endY + 10);
    }

    ctx.beginPath();
    ctx.moveTo(startX, 20);
    ctx.lineTo(startX, startY);
    ctx.lineTo(W - 20, startY);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const startRound = async () => {
    try {
      const { data } = await api.post('/games/crash/join', { betPoints: bet });
      
      // 🔥 ATUALIZAÇÃO: Retira o dinheiro da carteira ao entrar no avião
      updatePoints(data.points);

      setBetIn(true);
      setCrashPoint(data.crashPoint);
      setCrashed(false);
      setCashedOut(false);
      setMultiplier(1.00);
      setRunning(true);
      progressRef.current = 0;
      let current = 1.00;

      const animate = () => {
        current = parseFloat((current * 1.015).toFixed(2));
        setMultiplier(current);
        progressRef.current = Math.min(0.95, 1 - 1 / Math.pow(current, 0.4));
        draw(progressRef.current, false, false);

        if (current >= data.crashPoint) {
          draw(progressRef.current, true, false);
          setCrashed(true);
          setRunning(false);
          setBetIn(false);
          setHistory(h => [parseFloat(current.toFixed(2)), ...h.slice(0, 9)]);
          toast.error(`💥 Crash em ${current.toFixed(2)}x!`);
          
          // 🔥 ATUALIZAÇÃO: Re-sincroniza saldo final se necessário no crash
          updatePoints(data.points);
          refresh();
          return;
        }
        intervalRef.current = setTimeout(animate, 100);
      };
      intervalRef.current = setTimeout(animate, 100);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const cashout = async () => {
    if (!running || !betIn) return;
    clearTimeout(intervalRef.current);
    try {
      const { data } = await api.post('/games/crash/cashout', { betPoints: bet, multiplier, crashPoint });
      
      // 🔥 ATUALIZAÇÃO: Deposita o lucro do multiplicador no cabeçalho
      updatePoints(data.points);

      setCashedOut(true);
      setBetIn(false);
      setRunning(false);
      draw(progressRef.current, false, true);
      toast.success(`💰 Cashout ${multiplier.toFixed(2)}x! +${formatPoints(data.winPoints)}`);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    draw(0, false, false);
    return () => { clearTimeout(intervalRef.current); };
  }, []);

  const multColor = crashed ? '#ef4444' : cashedOut ? '#10b981' : multiplier < 2 ? '#10b981' : multiplier < 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex gap-1.5 flex-wrap mb-3">
        {history.map((h, i) => (
          <span key={i}
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: h < 2 ? 'rgba(239,68,68,0.15)' : h < 5 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
              color: h < 2 ? '#ef4444' : h < 5 ? '#f59e0b' : '#10b981',
              border: `1px solid ${h < 2 ? 'rgba(239,68,68,0.3)' : h < 5 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
            }}>
            {h.toFixed(2)}x
          </span>
        ))}
      </div>

      <div className="relative rounded-card2 overflow-hidden mb-3 border border-border">
        <canvas ref={canvasRef} width={700} height={340} className="w-full" style={{ display: 'block' }} />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <motion.div
              className="text-7xl font-black tabular-nums drop-shadow-lg"
              style={{ color: multColor, textShadow: `0 0 30px ${multColor}66` }}
              animate={running ? { scale: [1, 1.03, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.4 }}
            >
              {multiplier.toFixed(2)}x
            </motion.div>
            {crashed && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-red font-bold text-lg mt-1">💥 CRASHED</motion.div>
            )}
            {cashedOut && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="font-bold text-lg mt-1" style={{ color: '#10b981' }}>✅ CASHOUT!</motion.div>
            )}
          </div>
        </div>
      </div>

      <Card>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text2 mb-1.5">💎 Aposta (pts)</label>
            <div className="flex gap-2">
              <input type="number" min="1" step="1" value={bet} disabled={running}
                onChange={e => setBet(Math.max(1, +e.target.value))}
                className="flex-1 bg-bg3 border border-border2 text-white rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:border-orange" />
              {[10, 50, 100, 500].map(v => (
                <button key={v} disabled={running} onClick={() => setBet(v)}
                  className="px-2.5 py-2 rounded-lg bg-bg4 border border-border text-xs font-semibold hover:border-orange transition-colors disabled:opacity-40">
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-3">
          <Button onClick={startRound} disabled={running} className="flex-1 py-3">
            ✈️ Iniciar Voo
          </Button>
          <Button onClick={cashout} disabled={!running || cashedOut || !betIn}
            className="flex-1 py-3"
            style={{ background: running && betIn ? '#10b981' : undefined, color: running && betIn ? '#fff' : undefined }}>
            💰 Cashout — {formatPoints(Math.round(bet * multiplier))}
          </Button>
        </div>
      </Card>
    </div>
  );
}


// ── CASE OPENING ─────────────────────────────────────────────────────────────

export function CaseOpeningGame() {
  const { refresh } = useGame();
  const [cases, setCases]         = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [spinning, setSpinning]   = useState(false);
  const [result, setResult]       = useState(null);
  const [reelOffset, setReelOffset] = useState(0);
  const [reelItems, setReelItems] = useState([]);
  const reelContainerRef = useRef(null);
  const ITEM_W = 88;
  const WINNING_INDEX = 45;

  useEffect(() => {
    api.get('/games/cases')
      .then(({ data }) => {
        setCases(data.cases || []);
        if (data.cases?.length) setSelectedCase(data.cases[0]);
      })
      .catch(() => toast.error('Não foi possível carregar as caixas'))
      .finally(() => setLoadingCases(false));
  }, []);

  const openCase = async () => {
    if (!selectedCase) return;
    setSpinning(true);
    setResult(null);
    try {
      const { data } = await api.post('/games/cases/open', { caseId: selectedCase.id });
      const caseItems = selectedCase.items || [];
      const reel = Array(60).fill(null).map(() => caseItems[Math.floor(Math.random() * caseItems.length)]);
      reel[WINNING_INDEX] = data.item;
      setReelItems(reel);
      setReelOffset(0);
      const containerWidth = reelContainerRef.current?.offsetWidth || 600;
      const INNER_PADDING = 8;
      const itemCenter = INNER_PADDING + WINNING_INDEX * ITEM_W + ITEM_W / 2;
      const target = itemCenter - containerWidth / 2;
      let current = 0;
      const interval = setInterval(() => {
        current = Math.min(current + Math.min(60, (target - current) * 0.08 + 5), target);
        setReelOffset(current);
        if (current >= target) {
          clearInterval(interval);
          setSpinning(false);
          setResult(data.item);
          refresh();
          toast.success(`📦 ${data.item.name} → +${data.pointsWon} pontos!`);
        }
      }, 16);
    } catch (err) { setSpinning(false); toast.error(err.response?.data?.error || err.message); }
  };

  const previewItems = selectedCase?.items?.length
    ? Array(20).fill(null).map((_, i) => selectedCase.items[i % selectedCase.items.length])
    : [];

  if (loadingCases) {
    return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <h3 className="font-bold text-sm mb-3 text-text2">📦 Escolhe a tua caixa</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cases.map(c => (
            <button key={c.id} onClick={() => {
                setSelectedCase(c);
                setResult(null);
                setReelItems([]);
                setReelOffset(0);
              }}
              className={`bg-bg3 border-2 rounded-card p-3 text-center transition-all
                ${selectedCase?.id === c.id ? 'border-orange bg-orange/5' : 'border-border hover:border-border2'}`}>
              <div className="text-3xl mb-1">{c.emoji}</div>
              <div className="text-xs font-bold truncate">{c.name}</div>
              <div className="text-xs text-orange font-semibold">{formatPoints(c.price)}</div>
            </button>
          ))}
        </div>
      </div>

      {selectedCase && (
        <>
          <Card className="text-center mb-4">
            <div className="text-6xl mb-2">{selectedCase.emoji}</div>
            <div className="font-bold text-lg">{selectedCase.name}</div>
            <p className="text-text2 text-xs mt-1 max-w-sm mx-auto">{selectedCase.description}</p>
            <div className="text-orange font-bold mt-1">{formatPoints(selectedCase.price)}</div>
          </Card>

          <Card className="mb-4">
            <div ref={reelContainerRef} className="relative h-24 overflow-hidden rounded-xl border border-border mb-4">
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-20 border-2 border-orange rounded-xl z-10 bg-orange/5 pointer-events-none" />
              <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-bg3 to-transparent z-10 pointer-events-none" />
              <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-bg3 to-transparent z-10 pointer-events-none" />
              <div className="flex gap-2 p-2 h-full" style={{ transform: `translateX(-${reelOffset}px)`, transition: 'none' }}>
                {(reelItems.length > 0 ? reelItems : previewItems).map((item, i) => item && (
                  <div key={i} className="w-20 flex-shrink-0 h-full rounded-lg flex flex-col items-center justify-center gap-1"
                    style={{ background: RARITY_BG[item.rarity] || '#374151', border: `2px solid ${(RARITY_COLORS[item.rarity] || '#9ca3af')}44` }}>
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-[9px] font-bold text-center px-1" style={{ color: RARITY_COLORS[item.rarity] }}>{item.rarity}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={openCase} loading={spinning} className="w-full py-3">
              📦 Abrir {selectedCase.name} — {formatPoints(selectedCase.price)}
            </Button>
          </Card>
        </>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="text-center" style={{ border: `2px solid ${(RARITY_COLORS[result.rarity] || '#9ca3af')}55` }}>
              <div className="text-5xl mb-2">{result.emoji || '🔫'}</div>
              <div className="font-bold text-lg" style={{ color: RARITY_COLORS[result.rarity] }}>{result.name}</div>
              <Badge color="gray" className="mt-2">{result.rarity}</Badge>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-blue/10 text-blue px-3 py-1 rounded-full text-sm font-bold">
                💎 +{result.points_value} pontos
              </div>
              <p className="text-text2 text-xs mt-2">Item visual adicionado ao inventário</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedCase?.items?.length > 0 && (
        <Card className="mt-4">
          <h3 className="font-bold mb-3 text-sm">📊 Itens desta caixa</h3>
          {selectedCase.items.map(item => (
            <div key={item.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
              <span className="text-base flex-shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</div>
                <div className="text-[10px] text-text3">{item.rarity}</div>
              </div>
              <span className="text-xs text-blue font-semibold">+{item.points_value} pts</span>
              <span className="text-xs text-text2 w-14 text-right">{parseFloat(item.chance).toFixed(3)}%</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── ROLETA EUROPEIA ────────────────────────────────────────────────────────────
const ROULETTE_RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function numberColor(n) {
  if (n === 0) return 'green';
  return ROULETTE_RED.has(n) ? 'red' : 'black';
}
const COLOR_HEX = { red: '#dc2626', black: '#18181b', green: '#16a34a' };

// Ordem real dos números na roda física europeia
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

export function RouletteGame() {
  // 🛠️ ADICIONADO: updatePoints injetado no useGame
  const { user, refresh, updatePoints } = useGame();
  const [bets, setBets] = useState({});
  const [betInput, setBetInput] = useState(20);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);

  const totalStake = Object.values(bets).reduce((a, b) => a + b, 0);

  const addBet = (type, value) => {
    if (spinning) return;
    const key = `${type}:${value}`;
    setBets(prev => ({ ...prev, [key]: (prev[key] || 0) + betInput }));
  };

  const clearBets = () => { if (!spinning) setBets({}); };

  const removeBet = (key) => {
    if (spinning) return;
    setBets(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  function buildBetsPayload() {
    return Object.entries(bets).map(([key, amount]) => {
      const [type, value] = key.split(':');
      return { type, value: type === 'number' ? Number(value) : value, amount };
    });
  }

 const spin = async () => {
    const serverBets = buildBetsPayload();
    if (!serverBets.length) return toast.error('Faz pelo menos uma aposta');
    
    // Garantia extra: se o user não estiver carregado, não deixa rodar
    if (!user) return toast.error('Erro ao carregar dados do utilizador');

    setSpinning(true);
    setResult(null);
    
    // 1. CALCULA O CUSTO TOTAL DAS APOSTAS NA MESA
    const totalApostado = Object.values(bets).reduce((a, b) => a + b, 0);
    
    // 2. RETIRA INSTANTANEAMENTE OS PONTOS DA UI (Fase de Suspense)
    if (typeof user.points === 'number') {
      updatePoints(user.points - totalApostado);
    }

    try {
      const { data } = await api.post('/games/roulette', { bets: serverBets });

      const idx = WHEEL_ORDER.indexOf(data.winningNumber);
      const segAngle = 360 / 37;
      
      setRotation(prev => {
        const fullRotations = Math.ceil(prev / 360) * 360 + 360 * 5;
        return fullRotations - (idx * segAngle + segAngle / 2);
      });

      // 3. AGUARDA A ANIMAÇÃO TERMINAR (4.2 segundos)
      setTimeout(async () => {
        setSpinning(false);
        setResult(data);
        setBets({});
        
        // 4. ATUALIZA COM O VALOR REAL VINDO DO BACKEND
        updatePoints(data.points);
        await refresh();

        if (data.totalWon > 0) {
          toast.success(`🎉 Número ${data.winningNumber}! +${formatPoints(data.totalWon)}`);
        } else {
          toast.error(`😢 Saiu o ${data.winningNumber} (${data.winningColor})`);
        }
      }, 4200);
    } catch (err) {
      setSpinning(false);
      refresh(); // Se falhar, faz rollback e recupera os pontos do servidor
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const numbers = Array.from({ length: 37 }, (_, i) => i);
  const segAngle = 360 / 37;

  const ROWS = [
    [3,6,9,12,15,18,21,24,27,30,33,36],
    [2,5,8,11,14,17,20,23,26,29,32,35],
    [1,4,7,10,13,16,19,22,25,28,31,34],
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-5">

        {/* ── COLUNA ESQUERDA: roda ── */}
        <div>
          <Card className="text-center overflow-visible" style={{ background: 'radial-gradient(circle at 50% 30%, #2a1530, #150a18)' }}>
            <div className="relative w-full aspect-square max-w-[400px] mx-auto mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, #3d2410, #6b4423, #3d2410, #6b4423, #3d2410)',
                  boxShadow: '0 0 0 4px #1a0f08, 0 12px 40px rgba(0,0,0,.6), inset 0 0 30px rgba(0,0,0,.5)',
                }}
              />

              <motion.div
                className="absolute rounded-full"
                style={{
                  inset: '6%',
                  background: `conic-gradient(${WHEEL_ORDER.map((n, i) =>
                    `${COLOR_HEX[numberColor(n)]} ${i * segAngle}deg ${(i + 1) * segAngle}deg`
                  ).join(',')})`,
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,.6), 0 0 0 3px #d4af37',
                }}
                animate={{ rotate: rotation }}
                transition={{ duration: 4, ease: [0.15, 0.85, 0.25, 1] }}
              >
                {WHEEL_ORDER.map((n, i) => (
                  <div key={n} className="absolute inset-0 flex justify-center"
                    style={{ transform: `rotate(${i * segAngle + segAngle / 2}deg)` }}>
                    <span className="text-white font-bold select-none" style={{ fontSize: '0.6rem', marginTop: '3%' }}>{n}</span>
                  </div>
                ))}
              </motion.div>

              <div className="absolute" style={{ inset: 0 }}>
                <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                  style={{ top: '7%', background: 'radial-gradient(circle at 35% 30%, #fff, #ccc)', boxShadow: '0 1px 4px rgba(0,0,0,.6)' }} />
              </div>

              <div className="absolute rounded-full flex items-center justify-center z-10"
                style={{
                  inset: '38%',
                  background: 'radial-gradient(circle at 35% 30%, #f4d77c, #b8860b 60%, #6b4f10)',
                  boxShadow: '0 4px 16px rgba(0,0,0,.7), inset 0 2px 4px rgba(255,255,255,.4)',
                }}>
                {result && !spinning ? (
                  <span className="text-lg font-black text-white drop-shadow">{result.winningNumber}</span>
                ) : (
                  <div className="w-1/2 h-1/2 rounded-full" style={{ background: 'radial-gradient(circle, #fff8dc, #d4af37)' }} />
                )}
              </div>
            </div>

            {result && !spinning && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
                <Badge color={result.totalWon > 0 ? 'green' : 'red'}>
                  {result.totalWon > 0 ? `🎉 Ganhastes ${formatPoints(result.totalWon)}!` : '😢 Sem sorte desta vez'}
                </Badge>
              </motion.div>
            )}
          </Card>

          <Card className="mt-4">
            <label className="text-xs font-medium text-text2 block mb-2">💎 Valor por ficha</label>
            <div className="flex items-center gap-2">
              <input type="number" min="1" step="1" value={betInput} disabled={spinning}
                onChange={e => setBetInput(Math.max(1, +e.target.value))}
                className="flex-1 bg-bg3 border border-border2 text-white rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-orange" />
              {[10, 50, 100, 500].map(v => (
                <button key={v} disabled={spinning} onClick={() => setBetInput(v)}
                  className="px-2.5 py-2 rounded-lg bg-bg4 border border-border text-xs font-semibold hover:border-orange transition-colors disabled:opacity-40">
                  {v}
                </button>
              ))}
            </div>
          </Card>

          <Button onClick={spin} loading={spinning} disabled={!Object.keys(bets).length} className="w-full py-3 mt-4">
            {spinning ? 'A girar...' : `🎡 Girar — ${formatPoints(totalStake)}`}
          </Button>

          {Object.keys(bets).length > 0 && (
            <Card className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">🎫 As tuas apostas</h3>
                <button onClick={clearBets} disabled={spinning} className="text-xs text-text3 hover:text-red transition-colors disabled:opacity-40">
                  Limpar tudo
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {Object.entries(bets).map(([key, amount]) => {
                  const [type, value] = key.split(':');
                  const label = type === 'color' ? (value === 'red' ? 'Vermelho' : value === 'black' ? 'Preto' : 'Verde') :
                                type === 'parity' ? (value === 'even' ? 'Par' : 'Ímpar') : `Número ${value}`;
                  return (
                    <div key={key} className="flex items-center justify-between bg-bg4 rounded-lg px-3 py-1.5 text-xs">
                      <span className="text-text2">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-orange">{formatPoints(amount)}</span>
                        <button onClick={() => removeBet(key)} disabled={spinning} className="text-text3 hover:text-red transition-colors disabled:opacity-40">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-sm font-bold">
                <span>Total apostado</span>
                <span className="text-orange">{formatPoints(totalStake)}</span>
              </div>
            </Card>
          )}
        </div>

        {/* ── COLUNA DIREITA: grelha ── */}
        <div>
          <Card>
            <h3 className="font-bold text-sm mb-3">🎯 Mesa de Apostas — clica para apostar</h3>

            <div className="flex border border-border2 rounded-card overflow-hidden">
              <button disabled={spinning} onClick={() => addBet('number', 0)}
                className={`relative w-10 flex-shrink-0 flex items-center justify-center text-sm font-bold text-white border-2
                  transition-all ${bets['number:0'] ? 'border-orange' : 'border-transparent hover:brightness-110'}`}
                style={{ background: COLOR_HEX.green }}>
                0
                {bets['number:0'] && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange text-black text-[9px] font-black rounded-full flex items-center justify-center">{bets['number:0']}</span>}
              </button>

              <div className="flex-1 grid grid-rows-3 gap-px bg-border2">
                {ROWS.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-12 gap-px">
                    {row.map(n => {
                      const key = `number:${n}`;
                      const has = bets[key];
                      const color = numberColor(n);
                      return (
                        <button key={n} disabled={spinning} onClick={() => addBet('number', n)}
                          className={`relative aspect-[4/3] flex items-center justify-center text-xs font-bold text-white border-2
                            transition-all disabled:opacity-60 ${has ? 'border-orange z-10' : 'border-transparent hover:brightness-110'}`}
                          style={{ background: COLOR_HEX[color] }}>
                          {n}
                          {has && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange text-black text-[9px] font-black rounded-full flex items-center justify-center z-20">{has}</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px bg-border2 mt-px rounded-b-card overflow-hidden">
              {[
                { label: '1ª 12', value: '1' },
                { label: '2ª 12', value: '2' },
                { label: '3ª 12', value: '3' },
              ].map(d => {
                const key = `dozen:${d.value}`;
                const has = bets[key];
                return (
                  <button key={d.value} disabled={spinning} onClick={() => addBet('dozen', d.value)}
                    className={`relative py-2.5 text-xs font-bold bg-bg4 transition-all disabled:opacity-50
                      ${has ? 'text-orange ring-2 ring-inset ring-orange' : 'text-text2 hover:bg-bg3'}`}>
                    {d.label}
                    {has && <span className="absolute top-1 right-1 w-4 h-4 bg-orange text-black text-[9px] font-black rounded-full flex items-center justify-center">{has}</span>}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-6 gap-px bg-border2 mt-2 rounded-card overflow-hidden">
              <button disabled={spinning} onClick={() => addBet('half', 'low')}
                className={`relative py-2.5 text-[11px] font-bold bg-bg4 transition-all disabled:opacity-50
                  ${bets['half:low'] ? 'text-orange ring-2 ring-inset ring-orange' : 'text-text2 hover:bg-bg3'}`}>
                1-18
                {bets['half:low'] && <span className="absolute top-1 right-1 w-4 h-4 bg-orange text-black text-[9px] font-black rounded-full flex items-center justify-center">{bets['half:low']}</span>}
              </button>
              <button disabled={spinning} onClick={() => addBet('parity', 'even')}
                className={`relative py-2.5 text-[11px] font-bold bg-bg4 transition-all disabled:opacity-50
                  ${bets['parity:even'] ? 'text-orange ring-2 ring-inset ring-orange' : 'text-text2 hover:bg-bg3'}`}>
                Par
                {bets['parity:even'] && <span className="absolute top-1 right-1 w-4 h-4 bg-orange text-black text-[9px] font-black rounded-full flex items-center justify-center">{bets['parity:even']}</span>}
              </button>
              <button disabled={spinning} onClick={() => addBet('color', 'red')}
                className={`relative py-2.5 flex items-center justify-center transition-all disabled:opacity-50 border-2
                  ${bets['color:red'] ? 'border-orange' : 'border-transparent hover:brightness-110'}`}
                style={{ background: COLOR_HEX.red }}>
                <div className="w-4 h-4 rounded-sm" style={{ background: COLOR_HEX.red, border: '1.5px solid #fff' }} />
                {bets['color:red'] && <span className="absolute top-1 right-1 w-4 h-4 bg-orange text-black text-[9px] font-black rounded-full flex items-center justify-center">{bets['color:red']}</span>}
              </button>
              <button disabled={spinning} onClick={() => addBet('color', 'black')}
                className={`relative py-2.5 flex items-center justify-center transition-all disabled:opacity-50 border-2
                  ${bets['color:black'] ? 'border-orange' : 'border-transparent hover:brightness-110'}`}
                style={{ background: COLOR_HEX.black }}>
                <div className="w-4 h-4 rounded-sm" style={{ background: COLOR_HEX.black, border: '1.5px solid #fff' }} />
                {bets['color:black'] && <span className="absolute top-1 right-1 w-4 h-4 bg-orange text-black text-[9px] font-black rounded-full flex items-center justify-center">{bets['color:black']}</span>}
              </button>
              <button disabled={spinning} onClick={() => addBet('parity', 'odd')}
                className={`relative py-2.5 text-[11px] font-bold bg-bg4 transition-all disabled:opacity-50
                  ${bets['parity:odd'] ? 'text-orange ring-2 ring-inset ring-orange' : 'text-text2 hover:bg-bg3'}`}>
                Ímpar
                {bets['parity:odd'] && <span className="absolute top-1 right-1 w-4 h-4 bg-orange text-black text-[9px] font-black rounded-full flex items-center justify-center">{bets['parity:odd']}</span>}
              </button>
              <button disabled={spinning} onClick={() => addBet('half', 'high')}
                className={`relative py-2.5 text-[11px] font-bold bg-bg4 transition-all disabled:opacity-50
                  ${bets['half:high'] ? 'text-orange ring-2 ring-inset ring-orange' : 'text-text2 hover:bg-bg3'}`}>
                19-36
                {bets['half:high'] && <span className="absolute top-1 right-1 w-4 h-4 bg-orange text-black text-[9px] font-black rounded-full flex items-center justify-center">{bets['half:high']}</span>}
              </button>
            </div>
          </Card>

          {result && !spinning && (
            <Card className="mt-4">
              <h3 className="font-bold text-sm mb-2">📋 Resultado: número {result.winningNumber} ({result.winningColor})</h3>
              <div className="space-y-1.5">
                {result.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-text2">
                      {r.type === 'color' ? (r.value === 'red' ? 'Vermelho' : r.value === 'black' ? 'Preto' : 'Verde') :
                       r.type === 'parity' ? (r.value === 'even' ? 'Par' : 'Ímpar') : `Número ${r.value}`}
                      {' — '}{formatPoints(r.amount)}
                    </span>
                    <Badge color={r.won ? 'green' : 'red'}>
                      {r.won ? `✅ +${formatPoints(r.winAmount)}` : '❌'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DICE (HiLo) ────────────────────────────────────────────────────────────────
export function DiceGame() {
  // 🛠️ CORRIGIDO: Adicionado 'user' para permitir a manipulação imediata do saldo local
  const { user, refresh, updatePoints } = useGame();
  const [bet, setBet] = useState(50);
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState('over');
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [displayRoll, setDisplayRoll] = useState(50); 
  const [gameMessage, setGameMessage] = useState(null);

  const chance = direction === 'over' ? (100 - target) : (target - 1);
  const edge = 0.01;
  const multiplier = chance > 0 ? Math.floor((1 / (chance / 100)) * (1 - edge) * 100) / 100 : 0;

  useEffect(() => {
    let interval;
    if (rolling) {
      interval = setInterval(() => {
        setDisplayRoll(Math.floor(Math.random() * 99) + 1);
      }, 60);
    }
    return () => clearInterval(interval);
  }, [rolling]);

const roll = async () => {
    if (!user) return toast.error('Erro ao carregar dados do utilizador');
    if (user.points < bet) return toast.error('Saldo insuficiente');

    // 1. DEDUÇÃO LOCAL IMEDIATA
    updatePoints(user.points - bet);

    setRolling(true);
    setResult(null);
    setGameMessage(null);

    // Forçamos o ecrã a rodar números por 1500ms
    const delayPromise = new Promise(resolve => setTimeout(resolve, 1500));
    const apiPromise = api.post('/games/dice', { betPoints: bet, target, direction });
    
    try {
      const [_, apiResponse] = await Promise.all([delayPromise, apiPromise]);
      const { data } = apiResponse;

      // 2. MOSTRA O NÚMERO PRIMEIRO
      // O dado para de rodar e fixa-se no número final gerado pelo servidor
      setResult(data);
      setDisplayRoll(data.roll);
      setRolling(false);

      // 3. COMPASSO DE ESPERA DE 300ms (Aguardando a animação do número terminar)
      // Só depois do número estar espetado no ecrã é que os pontos entram
      setTimeout(async () => {
        updatePoints(data.points);
        await refresh();
        
        if (data.won) {
          setGameMessage({
            type: 'win',
            text: `🎉 Ganhaste! O dado deu ${data.roll}. Recebeste +${formatPoints(data.winPoints)} pts!`
          });
        } else {
          setGameMessage({
            type: 'loss',
            text: `❌ Não foi desta vez! O dado deu ${data.roll}.`
          });
        }
      }, 300); // 300ms de delay cirúrgico para a animação do número acabar

    } catch (err) {
      setRolling(false);
      refresh();
      setGameMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Erro no processamento'
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Card className="bg-[#0f141c] border border-slate-800 text-white">
        <div className="relative h-40 bg-[#0a0d14] rounded-xl border border-slate-900 flex flex-col items-center justify-center overflow-hidden mb-6 shadow-inner">
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_14px]" />
          
          <AnimatePresence mode="wait">
            <motion.div 
              key={displayRoll}
              initial={rolling ? { y: -10, opacity: 0.5 } : { scale: 0.9 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              className="text-7xl font-black tracking-tighter filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              style={{
                color: result ? (result.won ? '#10b981' : '#ef4444') : '#f59e0b'
              }}
            >
              {displayRoll.toFixed(0)}
            </motion.div>
          </AnimatePresence>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
            {rolling ? 'A Sortear...' : result ? (result.won ? 'Vitória!' : 'Derrota') : 'Escolha o Alvo'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="bg-[#161d2a] border border-slate-800 p-2.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1 mb-0.5">
              <Shield size={12} /> Alvo
            </span>
            <span className="text-sm font-black text-white">{target}</span>
          </div>
          
          <div className="bg-[#161d2a] border border-slate-800 p-2.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1 mb-0.5">
              <span className="text-orange-400 font-black text-xs">%</span> Chance
            </span>
            <span className="text-sm font-black text-orange-400 text-orange">{chance}%</span>
          </div>
          
          <div className="bg-[#161d2a] border border-slate-800 p-2.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-1 mb-0.5">
              <Zap size={12} /> Multiplicador
            </span>
            <span className="text-sm font-black text-amber-400 text-orange">{multiplier}x</span>
          </div>
        </div>

        <div className="mb-8 relative pt-6">
          <div className="relative h-4 bg-[#1a2232] rounded-full border border-slate-800 shadow-inner">
            <div 
              className={`absolute inset-y-0 left-0 rounded-l-full transition-colors duration-300 ${direction === 'under' ? 'bg-emerald-500 bg-success' : 'bg-red-500'}`}
              style={{ width: `${target}%` }}
            />
            <div 
              className={`absolute inset-y-0 right-0 rounded-r-full transition-colors duration-300 ${direction === 'over' ? 'bg-emerald-500 bg-success' : 'bg-red-500'}`}
              style={{ width: `${100 - target}%` }}
            />

            <div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-150 pointer-events-none"
              style={{ left: `${target}%` }}
            >
              <div className="w-5 h-7 bg-white rounded-md shadow-lg border border-slate-300 flex items-center justify-center text-[10px] font-black text-black">
                ⋮
              </div>
            </div>

            {result && !rolling && (
              <motion.div 
                initial={{ y: -15, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                className="absolute -top-10 -translate-x-1/2 z-10"
                style={{ left: `${result.roll}%` }}
              >
                <div className={`px-2.5 py-1 rounded-md text-xs font-black text-white shadow-xl flex flex-col items-center ${result.won ? 'bg-emerald-600' : 'bg-red-600'}`}>
                  {result.roll}
                  <div className={`w-1.5 h-1.5 rotate-45 mt-[-3px] ${result.won ? 'bg-emerald-600' : 'bg-red-600'}`} />
                </div>
              </motion.div>
            )}

            <input 
              type="range" 
              min="2" 
              max="98" 
              value={target} 
              disabled={rolling}
              onChange={e => setTarget(+e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-bold px-1 mt-2 select-none">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-5 bg-[#0a0d14] p-1 rounded-xl border border-slate-900">
          <button 
            disabled={rolling} 
            onClick={() => setDirection('under')}
            className={`py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5
              ${direction === 'under' 
                ? 'bg-[#161d2a] text-orange border border-slate-700 shadow-md' 
                : 'bg-transparent text-slate-400 hover:text-white border border-transparent'}`}
          >
            <ArrowDown size={16} /> Under {target}
          </button>
          <button 
            disabled={rolling} 
            onClick={() => setDirection('over')}
            className={`py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5
              ${direction === 'over' 
                ? 'bg-[#161d2a] text-orange border border-slate-700 shadow-md' 
                : 'bg-transparent text-slate-400 hover:text-white border border-transparent'}`}
          >
            <ArrowUp size={16} /> Over {target}
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <input 
            type="number" 
            min="1" 
            step="1" 
            value={bet} 
            disabled={rolling}
            onChange={e => setBet(Math.max(1, +e.target.value))}
            className="flex-1 bg-[#161d2a] border border-slate-800 text-white rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-slate-600 font-medium" 
          />
          {[10, 50, 100, 500].map(v => (
            <button 
              key={v} 
              disabled={rolling} 
              onClick={() => setBet(v)}
              className="px-3.5 py-2 rounded-lg bg-[#161d2a] border border-slate-800 text-xs font-semibold hover:border-slate-600 text-slate-300 transition-colors disabled:opacity-40"
            >
              {v}
            </button>
          ))}
        </div>

        <Button onClick={roll} loading={rolling} className="w-full py-3.5 text-sm font-bold uppercase tracking-wider mb-3">
          🎲 Lançar — {formatPoints(bet)}
        </Button>

        {gameMessage && (
          <div className={`p-3 rounded-xl text-center text-sm font-bold border ${
            gameMessage.type === 'win' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
            gameMessage.type === 'loss' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700'
          }`}>
            {gameMessage.text}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── PLINKO ─────────────────────────────────────────────────────────────────────
// Baldes com prémio por número de linhas — posições fixas no tabuleiro.
// Todas as outras posições são "buraco" (perde a aposta).
const PLINKO_BUCKETS = {
  8:  { 2: 10, 4: 4, 6: 2, 8: 0, 10: 0, 12: 2, 14: 4, 16: 10 },   // 8 linhas: posições pares
  12: { 1: 15, 4: 5, 7: 2, 10: 0, 13: 0, 16: 0, 19: 2, 22: 5, 25: 15 },
  16: { 2: 15, 5: 5, 8: 2, 11: 0, 14: 0, 3: 0, 6: 0, 9: 0, 12: 0 }, // override abaixo
};
 
// Para 16 linhas: 17 posições (0-16), baldes em 2, 5, 8, 11, 14
const BUCKET_MULTS_16 = { 2: 15, 5: 5, 8: 2, 11: 5, 14: 15 };
 
function multColor(m) {
  if (m >= 10) return '#f59e0b';
  if (m >= 4)  return '#8b5cf6';
  if (m >= 2)  return '#3b82f6';
  if (m > 0)   return '#10b981';
  return '#374151'; // buraco
}
 
export function PlinkoGame() {
  const { refresh } = useGame();
  const [bet, setBet] = useState(50);
  const [rows, setRows] = useState(16);
  const [balls, setBalls] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [activeBucket, setActiveBucket] = useState(null);
 
  // Constrói o array de posições: 17 slots para 16 linhas, só 5 têm prémio
  const buildSlots = (r) => {
    const total = r + 1;
    const buckets = r === 16 ? BUCKET_MULTS_16
      : r === 12 ? { 1: 15, 3: 5, 6: 2, 9: 2, 11: 5, 13: 15 }
      : { 0: 15, 2: 5, 4: 2, 6: 5, 8: 15 };
    return Array.from({ length: total }, (_, i) => ({
      pos: i,
      mult: buckets[i] ?? 0, // 0 = buraco
    }));
  };
 
  const slots = buildSlots(rows);
 
  const generatePath = (finalPos, totalRows) => {
    const path = [];
    let col = 0;
    let rem = finalPos;
    for (let r = 0; r < totalRows; r++) {
      const remaining = totalRows - r;
      let goRight = rem >= remaining ? true : rem > 0 ? Math.random() > 0.5 : false;
      if (goRight) { col++; rem--; }
      const pegsInRow = r + 3;
      const stepX = 4.5;
      const xPct = 50 + (col - (pegsInRow - 1) / 2) * stepX;
      const yPct = ((r + 1) / (totalRows + 1)) * 80;
      path.push({ x: `${xPct}%`, y: `${yPct}%` });
    }
    // posição final no balde
    const slotWidth = 100 / (rows + 1);
    path.push({ x: `${finalPos * slotWidth + slotWidth / 2}%`, y: '92%' });
    return path;
  };
 
  const dropBall = async () => {
    try {
      const { data } = await api.post('/games/plinko', { betPoints: bet, rows });
      const keyframes = generatePath(data.position, rows);
      setBalls(prev => [...prev, {
        id: Date.now() + Math.random(),
        keyframesX: keyframes.map(p => p.x),
        keyframesY: keyframes.map(p => p.y),
        targetPosition: data.position,
        data,
      }]);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };
 
  const handleBallComplete = (ball) => {
    setLastResult(ball.data);
    setActiveBucket(ball.targetPosition);
    refresh();
    const mult = ball.data.multiplier;
    if (mult > 0) toast.success(`🎯 ${mult}x! +${formatPoints(ball.data.winPoints)}`);
    else toast.error('😢 Buraco! Tenta de novo.');
    setBalls(prev => prev.filter(b => b.id !== ball.id));
    setTimeout(() => setActiveBucket(null), 1500);
  };
 
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <h3 className="font-bold mb-2 text-center text-lg text-white">🪂 Plinko</h3>
 
        <div className="relative bg-[#0f141c] border border-slate-800 rounded-xl p-4 mb-4 overflow-hidden shadow-inner"
          style={{ height: '420px' }}>
 
          {/* Pinos */}
          <div className="flex flex-col justify-between h-[80%] mt-2 select-none">
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="flex justify-center items-center" style={{ gap: `${26 - rows * 0.8}px` }}>
                {Array.from({ length: r + 3 }, (_, c) => (
                  <div key={c} className="w-2 h-2 rounded-full bg-slate-400 shadow-[0_0_4px_rgba(255,255,255,0.6)] border border-slate-600" />
                ))}
              </div>
            ))}
          </div>
 
          {/* Bolas */}
          {balls.map(ball => (
            <motion.div key={ball.id}
              className="absolute w-3.5 h-3.5 rounded-full bg-red-500 border border-white shadow-[0_0_8px_#ef4444] z-20"
              initial={{ top: '2%', left: '50%', x: '-50%' }}
              animate={{ left: ball.keyframesX, top: ball.keyframesY }}
              transition={{ duration: rows * 0.11, ease: 'linear' }}
              onAnimationComplete={() => handleBallComplete(ball)}
            />
          ))}
 
          {/* Slots — baldes e buracos */}
          <div className="absolute bottom-2 left-2 right-2 flex gap-1">
            {slots.map(({ pos, mult }) => {
              const isBucket = mult > 0;
              const isActive = activeBucket === pos;
              return (
                <motion.div key={pos}
                  animate={isActive ? { scale: 1.2 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="flex-1 text-center py-2 rounded-md text-[9px] font-black"
                  style={{
                    background: isActive ? multColor(mult) : isBucket ? multColor(mult) + '22' : '#1e293b',
                    color: isActive ? '#000' : isBucket ? multColor(mult) : '#475569',
                    border: `1px solid ${isBucket ? multColor(mult) + (isActive ? 'ff' : '55') : '#334155'}`,
                    boxShadow: isActive ? `0 0 12px ${multColor(mult)}` : 'none',
                  }}>
                  {isBucket ? `${mult}x` : '✕'}
                </motion.div>
              );
            })}
          </div>
        </div>
 
        {/* Último resultado */}
        {lastResult && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-center">
            <Badge color={lastResult.multiplier > 0 ? 'green' : 'red'}>
              {lastResult.multiplier > 0
                ? `🎯 ${lastResult.multiplier}x → +${formatPoints(lastResult.winPoints)}`
                : '✕ Buraco — sem prémio'}
            </Badge>
          </motion.div>
        )}
 
        {/* Linhas */}
        <div className="flex gap-2 mb-3 bg-[#1a2232] p-1.5 rounded-xl border border-slate-800">
          {[8, 12, 16].map(r => (
            <button key={r} disabled={balls.length > 0} onClick={() => setRows(r)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all
                ${rows === r ? 'bg-orange text-black border-orange' : 'bg-transparent text-slate-400 border-transparent hover:text-white disabled:opacity-30'}`}>
              {r} linhas
            </button>
          ))}
        </div>
 
        {/* Aposta */}
        <div className="flex gap-2 mb-3">
          <input type="number" min="1" value={bet}
            onChange={e => setBet(Math.max(1, +e.target.value))}
            className="flex-1 bg-[#161d2a] border border-slate-800 text-white rounded-[10px] px-3 py-2 text-sm focus:outline-none" />
          {[10, 50, 100, 500].map(v => (
            <button key={v} onClick={() => setBet(v)}
              className="px-2.5 py-2 rounded-lg bg-[#161d2a] border border-slate-800 text-xs font-semibold hover:border-slate-600 text-slate-300 transition-colors">
              {v}
            </button>
          ))}
        </div>
 
        <Button onClick={dropBall} className="w-full py-3">
          🪂 Soltar Bola — {formatPoints(bet)}
        </Button>
      </Card>
    </div>
  );
}
 
export function PlinkoGame() {
  const { refresh } = useGame();
  const [bet, setBet] = useState(50);
  const [rows, setRows] = useState(16);
  const [dropping, setDropping] = useState(false);
  const [result, setResult] = useState(null);
  const [ballPos, setBallPos] = useState(null); // coluna final animada
 
  const drop = async () => {
    setDropping(true);
    setResult(null);
    setBallPos(null);
    try {
      const { data } = await api.post('/games/plinko', { betPoints: bet, rows });
      // Anima a bola caindo para a posição final
      setTimeout(() => {
        setBallPos(data.position);
        setTimeout(() => {
          setResult(data);
          refresh();
          if (data.winPoints > 0) toast.success(`🎯 ${data.multiplier}x! +${formatPoints(data.winPoints)}`);
          else toast.error('Sem multiplicador desta vez');
          setDropping(false);
        }, 600);
      }, 200);
    } catch (err) {
      setDropping(false);
      toast.error(err.response?.data?.error || err.message);
    }
  };
 
  const mults = PLINKO_MULTS[rows] || PLINKO_MULTS[16];
 
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <h3 className="font-bold mb-4 text-center">🪂 Plinko</h3>
 
        {/* Tabuleiro visual */}
        <div className="relative bg-bg4 rounded-card2 p-4 mb-4 overflow-hidden" style={{ minHeight: '220px' }}>
          {/* Pinos */}
          <div className="flex flex-col gap-2 items-center">
            {Array.from({ length: Math.min(rows, 8) }, (_, r) => (
              <div key={r} className="flex gap-3 justify-center">
                {Array.from({ length: r + 2 }, (_, c) => (
                  <div key={c} className="w-2 h-2 rounded-full bg-border2" />
                ))}
              </div>
            ))}
          </div>
 
          {/* Bola */}
          <AnimatePresence>
            {dropping && (
              <motion.div
                className="absolute text-xl"
                initial={{ top: 0, left: '50%', x: '-50%' }}
                animate={{ top: ballPos !== null ? '78%' : '40%', left: ballPos !== null ? `${(ballPos / (mults.length - 1)) * 90 + 5}%` : '50%' }}
                transition={{ duration: 0.8, ease: 'easeIn' }}
              >
                ⚪
              </motion.div>
            )}
          </AnimatePresence>
        </div>
 
        {/* Multiplicadores */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {mults.map((m, i) => (
            <div key={i}
              className={`flex-1 min-w-[36px] text-center py-2 rounded-lg text-xs font-bold transition-all
                ${result && result.position === i ? 'scale-110 ring-2 ring-white' : ''}`}
              style={{ background: multColor(m) + '33', color: multColor(m), border: `1px solid ${multColor(m)}55` }}>
              {m}x
            </div>
          ))}
        </div>
 
        {result && !dropping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 text-center">
            <Badge color={result.winPoints > 0 ? 'green' : 'red'}>
              {result.winPoints > 0 ? `✅ ${result.multiplier}x → +${formatPoints(result.winPoints)}` : `❌ ${result.multiplier}x (sem ganho)`}
            </Badge>
          </motion.div>
        )}
 
        {/* Controles */}
        <div className="flex gap-2 mb-3">
          {[8, 12, 16].map(r => (
            <button key={r} disabled={dropping} onClick={() => setRows(r)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all
                ${rows === r ? 'bg-orange text-black border-orange' : 'bg-bg4 text-text2 border-border2 hover:border-orange disabled:opacity-40'}`}>
              {r} linhas
            </button>
          ))}
        </div>
 
        <div className="flex gap-3 mb-3">
          <input type="number" min="1" value={bet} disabled={dropping}
            onChange={e => setBet(Math.max(1, +e.target.value))}
            className="flex-1 bg-bg3 border border-border2 text-white rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-orange" />
          {[10, 50, 100, 500].map(v => (
            <button key={v} disabled={dropping} onClick={() => setBet(v)}
              className="px-2.5 py-2 rounded-lg bg-bg4 border border-border text-xs font-semibold hover:border-orange transition-colors disabled:opacity-40">
              {v}
            </button>
          ))}
        </div>
 
        <Button onClick={drop} loading={dropping} className="w-full py-3">
          🪂 Soltar a Bola — {formatPoints(bet)}
        </Button>
      </Card>
    </div>
  );
}

// ── BLACKJACK DEFINITIVO ──────────────────────────────────────────────────────
function PlayingCard({ card, faceDown }) {
  return (
    <motion.div
      initial={{ rotateY: 90, scale: 0.8 }}
      animate={{ rotateY: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`w-14 h-20 rounded-lg flex items-center justify-center text-lg font-bold
        border shadow-card -ml-2 first:ml-0 flex-shrink-0
        ${faceDown ? 'bg-gradient-to-br from-blue/40 to-purple/40 border-slate-700' :
          card?.red ? 'bg-white text-red-600 border-gray-200' : 'bg-white text-gray-900 border-gray-200'}`}
    >
      {faceDown ? '' : card ? `${card.v}${card.s}` : ''}
    </motion.div>
  );
}

export function BlackjackGame() {
  const { user, refresh, updatePoints } = useGame();
  const [bet, setBet]   = useState(50);
  const [phase, setPhase] = useState('bet'); // bet | play | done
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [deck, setDeck] = useState([]);
  const [result, setResult] = useState(null);
  const [winPoints, setWinPoints] = useState(0);
  const [gameMessage, setGameMessage] = useState(null);

  const deal = async () => {
    if (!user) return toast.error('Erro ao carregar dados do utilizador');
    if (user.points < bet) return toast.error('Saldo insuficiente');

    updatePoints(user.points - bet);
    setGameMessage(null);

    const delayPromise = new Promise(resolve => setTimeout(resolve, 400));
    const apiPromise = api.post('/games/blackjack/deal', { betPoints: bet });

    try {
      const [_, apiResponse] = await Promise.all([delayPromise, apiPromise]);
      const { data } = apiResponse;

      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setDeck(data.deck);
      setPhase(data.isBlackjack ? 'done' : 'play');
      setResult(data.isBlackjack ? 'blackjack' : null);

      if (data.isBlackjack) {
        setTimeout(async () => {
          updatePoints(data.points);
          await refresh();
          setGameMessage({
            type: 'win',
            text: `🃏 NATURAL BLACKJACK! Recebeste +${formatPoints(bet * 2.5)} pts!`
          });
        }, 300);
      } else {
        updatePoints(data.points);
      }
    } catch (err) {
      refresh();
      setGameMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Erro ao iniciar jogo'
      });
    }
  };

  const action = async (act) => {
    if (!user) return;

    if (act === 'double') {
      if (user.points < bet) return toast.error('Saldo insuficiente para dobrar');
      updatePoints(user.points - bet); 
    }

    const delayPromise = new Promise(resolve => setTimeout(resolve, 450));
    const apiPromise = api.post('/games/blackjack/action', {
      action: act, playerHand, dealerHand, deck, betPoints: bet,
    });

    try {
      const [_, apiResponse] = await Promise.all([delayPromise, apiPromise]);
      const { data } = apiResponse;

      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setDeck(data.deck);
      
      if (data.result) {
        setTimeout(async () => {
          setResult(data.result);
          setWinPoints(data.winPoints);
          setPhase('done');
          
          updatePoints(data.points);
          await refresh();

          if (data.winPoints > 0) {
            setGameMessage({
              type: 'win',
              text: `🎉 Ganhaste! Mão vencedora com ${data.result === 'blackjack' ? 'Blackjack' : 'sucesso'}. Adicionados +${formatPoints(data.winPoints)} pts!`
            });
          } else if (data.result === 'push') {
            setGameMessage({
              type: 'draw',
              text: `🤝 Empate (Push)! A tua aposta foi devolvida.`
            });
          } else {
            setGameMessage({
              type: 'loss',
              text: data.result === 'bust' ? '💥 BUST! Ultrapassaste os 21 pontos.' : '❌ O Dealer ganhou esta mão.'
            });
          }
        }, 300);
      } else {
        updatePoints(data.points);
      }
    } catch (err) {
      refresh();
      setGameMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Erro na jogada'
      });
    }
  };

  const handVal = (hand) => {
    let t = hand.reduce((s, c) => {
      if (['J','Q','K'].includes(c.v)) return s + 10;
      if (c.v === 'A') return s + 11;
      return s + parseInt(c.v);
    }, 0);
    let aces = hand.filter(c => c.v === 'A').length;
    while (t > 21 && aces-- > 0) t -= 10;
    return t;
  };

  const reset = () => { 
    setPhase('bet'); 
    setPlayerHand([]); 
    setDealerHand([]); 
    setResult(null); 
    setWinPoints(0); 
    setGameMessage(null); 
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="rounded-xl p-6 min-h-64 flex flex-col items-center gap-4 border border-slate-800"
        style={{ background: 'radial-gradient(ellipse at center, #1a4731, #0d2b1e)' }}>
        {phase !== 'bet' && (
          <>
            <div className="w-full">
              <p className="text-xs text-white/50 text-center mb-2">
                DEALER {phase === 'done' ? `— ${handVal(dealerHand)}` : ''}
              </p>
              <div className="flex justify-center">
                {dealerHand.map((c, i) => (
                  <PlayingCard key={i} card={c} faceDown={i === 1 && phase === 'play'} />
                ))}
              </div>
            </div>
            <div className="text-white/30 text-xs">• • •</div>
            <div className="w-full">
              <p className="text-xs text-white/50 text-center mb-2">JOGADOR — {handVal(playerHand)}</p>
              <div className="flex justify-center">
                {playerHand.map((c, i) => <PlayingCard key={i} card={c} />)}
              </div>
            </div>
          </>
        )}
        {phase === 'bet' && (
          <div className="text-white/30 text-sm flex items-center gap-2 my-auto select-none">🃏 Configura e inicia</div>
        )}
      </div>

      <Card className="bg-[#0f141c] border border-slate-800 text-white space-y-4">
        <Input 
          label="💎 Aposta (pts)" 
          type="number" 
          min="1" 
          step="1" 
          value={bet}
          onChange={e => setBet(+e.target.value)} 
          disabled={phase === 'play'} 
        />
        
        <div className="flex gap-2 flex-wrap">
          {phase === 'bet'  && <Button onClick={deal} className="flex-1 font-bold">🃏 Distribuir</Button>}
          {phase === 'play' && (
            <>
              <Button onClick={() => action('hit')} className="flex-1 font-bold bg-blue-600 hover:bg-blue-700">Hit</Button>
              <Button onClick={() => action('stand')} className="flex-1 font-bold bg-amber-600 hover:bg-amber-700">Stand</Button>
              <Button onClick={() => action('double')} className="flex-1 font-bold bg-purple-600 hover:bg-purple-700">Double</Button>
            </>
          )}
          {phase === 'done' && <Button onClick={reset} className="flex-1 font-bold bg-slate-700 hover:bg-slate-600">🔄 Nova Mão</Button>}
        </div>

        {gameMessage && (
          <div className={`p-3 rounded-xl text-center text-sm font-bold border ${
            gameMessage.type === 'win' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
            gameMessage.type === 'loss' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
            gameMessage.type === 'draw' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700'
          }`}>
            {gameMessage.text}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── VÍDEO POKER ────────────────────────────────────────────────────
const HAND_LABELS = {
  'royal-flush':    { label: '🏆 Royal Flush',       color: '#f59e0b' },
  'straight-flush': { label: '🌟 Straight Flush',    color: '#8b5cf6' },
  'four-of-a-kind': { label: '💎 Quadra',            color: '#3b82f6' },
  'full-house':     { label: '🏠 Full House',        color: '#10b981' },
  'flush':          { label: '🌊 Flush',             color: '#10b981' },
  'straight':       { label: '📈 Sequência',         color: '#10b981' },
  'three-of-a-kind':{ label: '🎯 Trinca',            color: '#6b7280' },
  'two-pair':       { label: '✌️ Dois Pares',        color: '#6b7280' },
  'jacks-or-better':{ label: '👑 Par Alto',          color: '#6b7280' },
  'nothing':        { label: '❌ Sem Jogo',          color: '#ef4444' },
};

const PAYOUT_TABLE = [
  { hand: 'royal-flush',    payout: 800 },
  { hand: 'straight-flush', payout: 50  },
  { hand: 'four-of-a-kind', payout: 25  },
  { hand: 'full-house',     payout: 9   },
  { hand: 'flush',          payout: 6   },
  { hand: 'straight',       payout: 4   },
  { hand: 'three-of-a-kind',payout: 3   },
  { hand: 'two-pair',       payout: 2   },
  { hand: 'jacks-or-better', payout: 1   },
];
 
function PokerCard({ card, held, faceDown, onClick }) {
  if (!card) return <div className="w-16 h-24 rounded-lg bg-bg4 border border-border2" />;
  return (
    <motion.div whileHover={!faceDown ? { y: -4 } : {}} onClick={onClick}
      className={`relative w-16 h-24 rounded-lg flex flex-col items-center justify-center text-sm font-bold
        cursor-pointer select-none border-2 transition-all
        ${held ? 'border-orange shadow-glow' : 'border-border2 hover:border-border'}
        ${faceDown ? 'bg-gradient-to-br from-blue/40 to-purple/40' : card.red ? 'bg-white text-red-600' : 'bg-white text-gray-900'}`}
      style={{ minWidth: '64px' }}>
      {!faceDown && (
        <>
          <span className="text-lg">{card.v}</span>
          <span className="text-base">{card.s}</span>
        </>
      )}
      {held && <span className="absolute -top-5 text-[10px] font-bold text-orange">HOLD</span>}
    </motion.div>
  );
}
 
export function VideoPokerGame() {
  const { user, refresh, updatePoints } = useGame();
  const [bet, setBet] = useState(50);
  const [phase, setPhase] = useState('bet'); // bet | hold | done
  const [hand, setHand] = useState([]);
  const [deck, setDeck] = useState([]);
  const [held, setHeld] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
 
  const deal = async () => {
    if (!user) return toast.error('Erro ao carregar dados do utilizador');
    if (user.points < bet) return toast.error('Saldo insuficiente');

    setLoading(true);
    setResult(null);
    setHeld([]);

    updatePoints(user.points - bet);

    try {
      const { data } = await api.post('/games/poker/deal', { betPoints: bet });
      updatePoints(data.points);
      setHand(data.hand);
      setDeck(data.deck);
      setPhase('hold');
    } catch (err) {
      refresh();
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };
 
  const toggleHold = (i) => {
    if (phase !== 'hold') return;
    setHeld(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };
 
  const draw = async () => {
    setLoading(true);

    const delayPromise = new Promise(resolve => setTimeout(resolve, 400));
    const apiPromise = api.post('/games/poker/hold', { hand, deck, held, betPoints: bet });

    try {
      const [_, apiResponse] = await Promise.all([delayPromise, apiPromise]);
      const { data } = apiResponse;

      setHand(data.finalHand);
      setResult(data);
      setPhase('done');

      setTimeout(async () => {
        updatePoints(data.points);
        await refresh();

        if (data.winPoints > 0) {
          toast.success(`🃏 ${HAND_LABELS[data.handName]?.label}! +${formatPoints(data.winPoints)}`);
        } else {
          toast.error('Sem jogo desta vez');
        }
      }, 300);

    } catch (err) {
      refresh();
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-4">
          <Card className="p-3">
            <div className="grid grid-cols-3 gap-1">
              {PAYOUT_TABLE.map(p => {
                const info = HAND_LABELS[p.hand];
                const isWinner = result?.handName === p.hand;
                return (
                  <div key={p.hand} className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all
                    ${isWinner ? 'bg-orange/20 ring-1 ring-orange' : 'bg-bg4'}`}>
                    <span className="text-text2 truncate">{info?.label}</span>
                    <span className="font-bold text-orange ml-1 flex-shrink-0">{p.payout}x</span>
                  </div>
                );
              })}
            </div>
          </Card>
 
          <Card>
            <div className="flex justify-center gap-2 mb-5 mt-2" style={{ minHeight: '110px' }}>
              {phase === 'bet'
                ? Array.from({ length: 5 }, (_, i) => <PokerCard key={i} card={null} faceDown held={false} />)
                : hand.map((card, i) => (
                    <PokerCard key={i} card={card} held={held.includes(i)} faceDown={false}
                      onClick={() => phase === 'hold' && toggleHold(i)} />
                  ))
              }
            </div>
 
            {result && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="text-center mb-4">
                <div className="text-lg font-bold mb-1" style={{ color: HAND_LABELS[result.handName]?.color }}>
                  {HAND_LABELS[result.handName]?.label}
                </div>
                <Badge color={result.winPoints > 0 ? 'green' : 'red'}>
                  {result.winPoints > 0 ? `+${formatPoints(result.winPoints)} (${result.multiplier}x)` : 'Sem ganho'}
                </Badge>
              </motion.div>
            )}
 
            {phase === 'hold' && (
              <p className="text-center text-text2 text-xs mb-3">
                Clica nas cartas que queres guardar. As outras serão substituídas.
              </p>
            )}
 
            <div className="flex gap-3 mb-3">
              <input type="number" min="1" value={bet} disabled={phase !== 'bet' || loading}
                onChange={e => setBet(Math.max(1, +e.target.value))}
                className="flex-1 bg-bg3 border border-border2 text-white rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-orange" />
              {[10, 50, 100, 500].map(v => (
                <button key={v} disabled={phase !== 'bet' || loading} onClick={() => setBet(v)}
                  className="px-2.5 py-2 rounded-lg bg-bg4 border border-border text-xs font-semibold hover:border-orange transition-colors disabled:opacity-40">
                  {v}
                </button>
              ))}
            </div>
 
            {phase === 'bet' && <Button onClick={deal} loading={loading} className="w-full py-3">🃏 Distribuir — {formatPoints(bet)}</Button>}
            {phase === 'hold' && <Button onClick={draw} loading={loading} className="w-full py-3">🎴 Trocar Cartas</Button>}
            {phase === 'done' && <Button onClick={() => { setPhase('bet'); setHand([]); setResult(null); setHeld([]); }} className="w-full py-3">🔄 Nova Mão</Button>}
          </Card>
        </div>
 
        <div>
          <Card className="sticky top-0">
            <h3 className="font-bold text-sm mb-3">📖 Guia de Mãos</h3>
            <div className="space-y-2.5">
              {[
                { emoji: '👑', name: 'Royal Flush', payout: '800x', color: '#f59e0b', desc: 'A, K, Q, J, 10 do mesmo naipe' },
                { emoji: '🌟', name: 'Straight Flush', payout: '50x', color: '#8b5cf6', desc: '5 cartas seguidas do mesmo naipe' },
                { emoji: '💎', name: 'Quadra', payout: '25x', color: '#3b82f6', desc: '4 cartas do mesmo valor' },
                { emoji: '🏠', name: 'Full House', payout: '9x', color: '#10b981', desc: 'Trinca + Par' },
                { emoji: '🌊', name: 'Flush', payout: '6x', color: '#10b981', desc: '5 cartas do mesmo naipe' },
                { emoji: '📈', name: 'Sequência', payout: '4x', color: '#10b981', desc: '5 cartas seguidas (qualquer naipe)' },
                { emoji: '🎯', name: 'Trinca', payout: '3x', color: '#6b7280', desc: '3 cartas do mesmo valor' },
                { emoji: '✌️', name: 'Dois Pares', payout: '2x', color: '#6b7280', desc: 'Dois pares diferentes' },
                { emoji: '👑', name: 'Par Alto', payout: '1x', color: '#6b7280', desc: 'Par de J, Q, K ou A' },
              ].map((h, i) => (
                <div key={i} className="bg-bg4 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: h.color }}>
                      {h.emoji} {h.name}
                    </span>
                    <span className="text-xs font-black text-orange">{h.payout}</span>
                  </div>
                  <p className="text-[10px] text-text3">{h.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[10px] text-text3 text-center">💡 Dica: guarda sempre pares ou melhor. Com mão fraca, guarda cartas altas (J, Q, K, A).</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── SLOTS DEFINITIVO ──────────────────────────────────────────────────────────
const SYMBOL_COLORS = {
  cherry: '#ef4444', lemon: '#eab308', orange: '#f97316', grape: '#8b5cf6',
  melon: '#10b981', bell: '#f59e0b', star: '#3b82f6', diamond: '#06b6d4', seven: '#dc2626',
};

export function SlotsGame() {
  const { user, refresh, updatePoints } = useGame();
  const [bet, setBet] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [displayReels, setDisplayReels] = useState([{ emoji: '❓' }, { emoji: '❓' }, { emoji: '❓' }]);
  const [result, setResult] = useState(null);
  const [animatingReels, setAnimatingReels] = useState([false, false, false]);

  const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];

  const spin = async () => {
    if (spinning) return;
    if (!user) return toast.error('Erro ao carregar dados do utilizador');
    if (user.points < bet) return toast.error('Saldo insuficiente');

    // 🚨 GAMBIARRA DE FORÇA BRUTA: Altera o valor diretamente no objeto antes de qualquer assincronismo
    user.points = user.points - bet; 

    setSpinning(true);
    setResult(null);
    updatePoints(user.points); // Força o trigger do Contexto com o valor já subtraído
    setAnimatingReels([true, true, true]);

    // Loop de rotação visual rápida
    const interval = setInterval(() => {
      setDisplayReels([
        { emoji: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] },
        { emoji: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] },
        { emoji: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] },
      ]);
    }, 60);

    try {
      // O axios vai disparar em background, mas a UI já subtraiu lá em cima!
      const { data } = await api.post('/games/slots', { betPoints: bet });

      // Sequência de paragem dos rolos
      setTimeout(() => {
        clearInterval(interval);
        
        // Para Rolo 1
        setAnimatingReels([false, true, true]);
        setDisplayReels(prev => [data.reels[0], prev[1], prev[2]]);

        setTimeout(() => {
          // Para Rolo 2
          setAnimatingReels([false, false, true]);
          setDisplayReels(prev => [data.reels[0], data.reels[1], prev[2]]);

          setTimeout(async () => {
            // Para Rolo 3 (Fim da animação)
            setAnimatingReels([false, false, false]);
            setDisplayReels([data.reels[0], data.reels[1], data.reels[2]]);
            
            setResult(data);
            setSpinning(false);

            // 💰 Só aqui é que o saldo final real (com o prémio calculado no servidor) entra
            user.points = data.points;
            updatePoints(data.points);
            await refresh();
            
            if (data.winPoints > 0) {
              toast.success(`🎰 ${data.multiplier}x! +${formatPoints(data.winPoints)}`);
            } else {
              toast.error('Tenta de novo!');
            }
          }, 450);
        }, 450);
      }, 1000);

    } catch (err) {
      clearInterval(interval);
      setSpinning(false);
      setAnimatingReels([false, false, false]);
      // Se a API falhar, o refresh devolve o saldo original guardado no banco
      await refresh();
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card className="bg-[#0f141c] border border-slate-800 text-white overflow-hidden p-5">
        
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <Coins className="text-orange animate-pulse" size={18} />
            <h3 className="font-black text-white text-lg tracking-wider uppercase">Slots Pro</h3>
          </div>
          {result?.winPoints > 0 && !spinning && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md font-bold flex items-center gap-1"
            >
              <Trophy size={12} /> Big Win!
            </motion.div>
          )}
        </div>

        <div 
          className={`bg-[#0a0d14] border-2 rounded-2xl p-5 mb-5 relative transition-all duration-300 ${
            spinning 
              ? 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]' 
              : result?.winPoints > 0 
                ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)] animate-bounce' 
                : 'border-slate-800 shadow-inner'
          }`}
        >
          <div className="absolute inset-y-4 left-2 w-1 flex flex-col justify-between opacity-40">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-1 h-1 rounded-full ${spinning ? 'bg-amber-400 animate-ping' : 'bg-slate-600'}`} />
            ))}
          </div>
          <div className="absolute inset-y-4 right-2 w-1 flex flex-col justify-between opacity-40">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-1 h-1 rounded-full ${spinning ? 'bg-amber-400 animate-ping' : 'bg-slate-600'}`} />
            ))}
          </div>

          <div className="flex gap-3.5 justify-center items-center px-2">
            {displayReels.map((reel, i) => {
              const isAnim = animatingReels[i];
              return (
                <div 
                  key={i} 
                  className="w-24 h-24 bg-[#141a26] border border-slate-800 rounded-xl flex items-center justify-center overflow-hidden relative"
                  style={{ boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.6)' }}
                >
                  <div className="absolute inset-x-0 h-px bg-slate-800/50 top-1/2 -translate-y-1/2 pointer-events-none" />
                  
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={reel?.emoji + i + isAnim}
                      className="text-5xl select-none block filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                      initial={isAnim ? {} : { scale: 0.4, y: -20, opacity: 0 }}
                      animate={isAnim ? {
                        y: [-12, 12],
                        filter: 'blur(3px)', 
                        scale: 0.95
                      } : { 
                        scale: [1.2, 1], 
                        y: 0, 
                        opacity: 1,
                        filter: 'blur(0px)'
                      }}
                      transition={isAnim ? { 
                        duration: 0.05, 
                        repeat: Infinity, 
                        repeatType: 'reverse',
                        ease: 'linear'
                      } : {
                        type: 'spring',
                        stiffness: 400,
                        damping: 14
                      }}
                    >
                      {reel?.emoji || '❓'}
                    </motion.span>
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 justify-center opacity-70">
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-orange/40" />
            <span className="text-orange text-[9px] font-black tracking-widest uppercase">Payline</span>
            <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-orange/40" />
          </div>
        </div>

        <div className="h-10 flex items-center justify-center mb-4">
          {result && !spinning ? (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <Badge color={result.winPoints > 0 ? 'green' : 'red'} className="text-xs py-1.5 px-4 font-black rounded-lg tracking-wide shadow-md">
                {result.winPoints > 0 
                  ? `🎉 GANHASTE ${result.multiplier}x → +${formatPoints(result.winPoints)}!` 
                  : '😔 Sem sorte — Tenta outra vez!'}
              </Badge>
            </motion.div>
          ) : (
            spinning && (
              <span className="text-xs text-slate-500 font-medium tracking-wide animate-pulse flex items-center gap-1.5">
                <Zap size={12} className="text-amber-500 animate-bounce" /> Cruzando linhas de pagamento...
              </span>
            )
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-5 text-center">
          {[
            { s: '🍒', n: 'Cherry', m: '2x', id: 'cherry' },
            { s: '🍋', n: 'Lemon', m: '3x', id: 'lemon' },
            { s: '🍊', n: 'Orange', m: '5x', id: 'orange' },
            { s: '🍇', n: 'Grape', m: '8x', id: 'grape' },
            { s: '🔔', n: 'Bell', m: '20x', id: 'bell' },
            { s: '⭐', n: 'Star', m: '40x', id: 'star' },
            { s: '💎', n: 'Diamond', m: '100x', id: 'diamond' },
            { s: '7️⃣', n: 'Lucky 7', m: '250x', id: 'seven' },
          ].map(sym => (
            <div 
              key={sym.id} 
              className="bg-[#141a26] border border-slate-900 rounded-xl p-1.5 flex flex-col items-center justify-center"
            >
              <span className="text-xl mb-0.5 filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)] select-none">{sym.s}</span>
              <span className="text-[10px] font-black tracking-tight" style={{ color: SYMBOL_COLORS[sym.id] }}>
                {sym.m}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4 bg-[#0a0d14] p-1.5 rounded-xl border border-slate-900 items-center">
          <input 
            type="number" 
            min="1" 
            value={bet} 
            disabled={spinning}
            onChange={e => setBet(Math.max(1, +e.target.value))}
            className="w-24 bg-[#141a26] border border-slate-800 text-white rounded-lg py-2 text-sm text-center font-bold focus:outline-none focus:border-slate-600 disabled:opacity-50" 
          />
          <div className="flex gap-1 flex-1">
            {[10, 50, 100].map(v => (
              <button 
                key={v} 
                disabled={spinning} 
                onClick={() => setBet(v)}
                className="flex-1 py-2 rounded-lg bg-[#141a26] border border-slate-800 text-xs font-bold hover:border-slate-600 text-slate-300 transition-colors disabled:opacity-30"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={spin} 
          loading={spinning} 
          className="w-full py-4 text-sm font-black uppercase tracking-widest shadow-lg active:scale-[0.99] transition-transform"
        >
          {spinning ? '🎰 A Rodar...' : `🎰 Girar Rolos — ${formatPoints(bet)}`}
        </Button>
      </Card>
    </div>
  );
}

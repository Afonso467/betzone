import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useGame } from '../../context/AuthContext';
import { Button, Card, Input, Select, Badge, Spinner } from '../ui';
import { formatPoints, RARITY_COLORS, RARITY_BG } from '../../utils/constants';
import { Plane, Rocket, DollarSign, Shield, Zap, ArrowDown, ArrowUp } from 'lucide-react';

// ── MINES ────────────────────────────────────────────────────────────────────
export function MinesGame() {
  const { refresh } = useGame();
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
        refresh();
      } else {
        setRevealed(data.revealed);
        setMultiplier(data.multiplier);
        setPotentialWin(data.potentialWin);
        toast.success(`💎 +${data.multiplier}x`, { duration: 1000 });
      }
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
  };

  const cashout = async () => {
    if (status !== 'playing' || !revealed.length) return;
    try {
      const { data } = await api.post('/games/mines/cashout', { sessionId });
      toast.success(`💰 Cashout: ${formatPoints(data.winPoints)} (${data.multiplier}x)!`);
      setStatus('won');
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
  const { refresh } = useGame();
  const [bet, setBet] = useState(50);
  const [choice, setChoice] = useState(null);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState(null);
  
  // Estado para controlar visualmente qual face está virada para o utilizador durante e após o giro
  const [visualFace, setVisualFace] = useState('heads'); 

  const flip = async () => {
    if (!choice) return toast.error('Escolhe Cara ou Coroa');
    
    setFlipping(true);
    setResult(null);

    // 1. Inicia um efeito alternado rápido enquanto a API responde para simular a rotação rápida das faces
    const faceInterval = setInterval(() => {
      setVisualFace(prev => (prev === 'heads' ? 'tails' : 'heads'));
    }, 150);

    try {
      const { data } = await api.post('/games/coinflip', { betPoints: bet, choice });
      
      // Para o ciclo rápido assim que temos a resposta real do servidor
      clearInterval(faceInterval);

      // 2. Sincroniza imediatamente o lado visual final com a resposta exata do backend
      setVisualFace(data.result);

      // 3. Aguarda o término da animação do Framer Motion antes de exibir os painéis de sucesso/erro
      setTimeout(() => {
        setResult(data);
        setFlipping(false);
        refresh();
        if (data.won) toast.success(`🎉 Ganhastes! +${formatPoints(data.winPoints)}`);
        else toast.error(`😢 Perdeste ${formatPoints(bet)}`);
      }, 900); // Sincronizado com os 0.9s da transição visual

    } catch (err) {
      clearInterval(faceInterval);
      setFlipping(false);
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="text-center">
        
        {/* Container Animado da Moeda */}
        <motion.div
          animate={flipping ? { 
            rotateY: [0, 180, 360, 540, 720],
            scale: [1, 1.15, 1.2, 1.05, 1] // Dá um efeito 3D de saltar em direção ao ecrã
          } : {}}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
          className="w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl border-4 select-none shadow-lg"
          style={{
            // O fundo adapta-se em tempo real com base no estado visual interno da moeda
            background: visualFace === 'heads' 
              ? 'linear-gradient(135deg, #d4af37, #f5d563)' 
              : 'linear-gradient(135deg, #6b7280, #9ca3af)',
            borderColor: visualFace === 'heads' ? '#d4af37' : '#6b7280',
          }}
        >
          {/* Mostra dinamicamente a Coroa ou a Cara mesmo enquanto gira */}
          {visualFace === 'heads' ? '👑' : '🦅'}
        </motion.div>

        {/* Seleção de Lado */}
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

        {/* Input de Valor */}
        <Input 
          label="💎 Aposta (pts)" 
          type="number" 
          min="1" 
          step="1" 
          value={bet}
          onChange={e => setBet(+e.target.value)} 
          disabled={flipping} 
        />
        
        {/* Botão de Ação */}
        <Button 
          onClick={flip} 
          loading={flipping} 
          disabled={!choice || flipping} 
          className="w-full py-3 mt-4 font-bold tracking-wide"
        >
          🎯 Lançar Moeda
        </Button>

        {/* Mensagem de Feedback de Resultado */}
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


// Supondo que estes sejam os teus componentes customizados importados
// import { Card, Badge, Input, Button, toast, api, useGame, formatPoints } from './teus-componentes';

export function CrashGame() {
  const { refresh } = useGame();
  const [bet, setBet] = useState(50);
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(null);
  const [running, setRunning] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [betIn, setBetIn] = useState(false);
  const [history, setHistory] = useState([1.23, 3.45, 1.01, 8.92, 2.11]);
  const intervalRef = useRef(null);

  const startRound = async () => {
    try {
      const { data } = await api.post('/games/crash/join', { betPoints: bet });
      setBetIn(true);
      setCrashPoint(data.crashPoint);
      setCrashed(false);
      setCashedOut(false);
      setMultiplier(1.00);
      setRunning(true);
      
      let current = 1.00;
      intervalRef.current = setInterval(() => {
        current = parseFloat((current * 1.015).toFixed(2));
        setMultiplier(current);
        
        if (current >= data.crashPoint) {
          clearInterval(intervalRef.current);
          setCrashed(true);
          setRunning(false);
          setBetIn(false);
          setHistory(h => [parseFloat(current.toFixed(2)), ...h.slice(0, 7)]);
          toast.error(`💥 Crash em ${current.toFixed(2)}x!`);
          refresh();
        }
      }, 100);
    } catch (err) { 
      toast.error(err.response?.data?.error || err.message); 
    }
  };

  const cashout = async () => {
    if (!running || !betIn) return;
    clearInterval(intervalRef.current);
    try {
      const { data } = await api.post('/games/crash/cashout', { betPoints: bet, multiplier, crashPoint });
      setCashedOut(true);
      setBetIn(false);
      setRunning(false);
      toast.success(`💰 Cashout ${multiplier.toFixed(2)}x! +${formatPoints(data.winPoints)}`);
      refresh();
    } catch (err) { 
      toast.error(err.response?.data?.error || err.message); 
    }
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const multColor = crashed 
    ? 'var(--red)' 
    : cashedOut 
    ? 'var(--green)' 
    : multiplier < 2 
    ? 'var(--green)' 
    : multiplier < 5 
    ? 'var(--orange)' 
    : 'var(--red)';

  // --- CÁLCULO DA POSIÇÃO DO AVIÃO ---
  // Limita os valores entre 0% e 80% para o avião não fugir da caixa visual antes do crash
  const progressX = Math.min((multiplier - 1) * 15, 80); 
  const progressY = Math.min((multiplier - 1) * 12, 70);

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        {/* Histórico */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {history.map((h, i) => (
            <Badge key={i} color={h < 2 ? 'red' : h < 5 ? 'orange' : 'green'}>
              {h.toFixed(2)}x
            </Badge>
          ))}
        </div>

        {/* Ecrã de Voo Animado (Aviator Style) */}
        <div className="h-56 bg-bg4 rounded-xl flex items-center justify-center relative overflow-hidden mb-4 border border-border bg-gradient-to-b from-slate-900 via-slate-950 to-black">
          
          {/* Linhas de Grelha de Gráfico ao fundo para dar sensação de movimento */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Status Indicators */}
          <AnimatePresence>
            {crashed && (
              <motion.span 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-3 right-3 bg-red/20 text-red px-2 py-0.5 rounded text-xs font-bold border border-red/30 z-10"
              >
                💥 CRASHED
              </motion.span>
            )}
            {cashedOut && (
              <motion.span 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-3 right-3 bg-green/20 text-success px-2 py-0.5 rounded text-xs font-bold border border-green/30 z-10"
              >
                ✅ CASHOUT
              </motion.span>
            )}
          </AnimatePresence>

          {/* Multiplicador Central */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <motion.div
              key={Math.floor(multiplier * 10)}
              className="text-6xl font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              style={{ color: multColor }}
              animate={running && !crashed ? { scale: [1, 1.04, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.4 }}
            >
              {multiplier.toFixed(2)}x
            </motion.div>
          </div>

          {/* O Avião e o Rasto de Fumo */}
          {running && !crashed && (
            <motion.div 
              className="absolute left-6 bottom-6 w-full h-full pointer-events-none"
              style={{ x: `${progressX}%`, y: `-${progressY}%` }}
              transition={{ type: 'tween', ease: 'linear' }}
            >
              {/* Linha de rasto curva do avião */}
              <svg className="absolute overflow-visible w-full h-full left-0 top-0 pointer-events-none">
                <motion.path
                  d={`M 0 160 Q ${progressX / 2} ${160 - progressY / 2}, ${progressX} ${160 - progressY}`}
                  fill="none"
                  stroke="rgba(239, 68, 68, 0.4)"
                  strokeWidth="3"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* O Avião propriamente dito */}
              <motion.div 
                className="absolute text-red-500 bottom-0 left-0"
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                style={{ transform: 'rotate(-15deg)' }}
              >
                <Plane size={36} className="fill-current text-red shadow-lg transform -rotate-45" />
                
                {/* Propulsor / Foguete visual traseiro */}
                <span className="absolute -left-2 top-3 w-2 h-2 rounded-full bg-orange animate-ping opacity-75" />
              </motion.div>
            </motion.div>
          )}

          {/* Estado de Espera (Antes do Jogo Começar) */}
          {!running && !crashed && !cashedOut && (
            <div className="absolute bottom-6 left-6 text-slate-500 flex items-center gap-2 text-sm font-medium">
              <Plane size={18} className="animate-pulse" />
              Avião pronto na pista...
            </div>
          )}
        </div>

        {/* Inputs e Controlos de Aposta */}
        <Input 
          label="💎 Aposta (pts)" 
          type="number" 
          min="1" 
          step="1" 
          value={bet}
          onChange={e => setBet(+e.target.value)} 
          disabled={running} 
        />

        <div className="flex gap-3 mt-4">
          <Button 
            onClick={startRound} 
            disabled={running} 
            className="flex-1 py-3 flex items-center justify-center gap-2"
          >
            <Rocket size={18} /> Iniciar
          </Button>
          
          <Button 
            onClick={cashout} 
            disabled={!running || cashedOut}
            className="flex-1 py-3 flex items-center justify-center gap-2 transition-all font-bold" 
            style={{ background: 'var(--green)', color: '#fff' }}
          >
            <DollarSign size={18} /> Cashout — {formatPoints(bet * multiplier)}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── BLACKJACK ─────────────────────────────────────────────────────────────────
function PlayingCard({ card, faceDown }) {
  return (
    <motion.div
      initial={{ rotateY: 90, scale: 0.8 }}
      animate={{ rotateY: 0, scale: 1 }}
      className={`w-14 h-20 rounded-lg flex items-center justify-center text-lg font-bold
        border shadow-card -ml-2 first:ml-0 flex-shrink-0
        ${faceDown ? 'bg-gradient-to-br from-blue/40 to-purple/40 border-border2' :
          card?.red ? 'bg-white text-red border-gray-200' : 'bg-white text-gray-900 border-gray-200'}`}
    >
      {faceDown ? '' : card ? `${card.v}${card.s}` : ''}
    </motion.div>
  );
}

export function BlackjackGame() {
  const { refresh } = useGame();
  const [bet, setBet]   = useState(50);
  const [phase, setPhase] = useState('bet'); // bet | play | done
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [deck, setDeck] = useState([]);
  const [result, setResult] = useState(null);
  const [winPoints, setWinPoints] = useState(0);

  const deal = async () => {
    try {
      const { data } = await api.post('/games/blackjack/deal', { betPoints: bet });
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setDeck(data.deck);
      setPhase(data.isBlackjack ? 'done' : 'play');
      setResult(data.isBlackjack ? 'blackjack' : null);
      if (data.isBlackjack) { toast.success('🃏 BLACKJACK!'); refresh(); }
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
  };

  const action = async (act) => {
    try {
      const { data } = await api.post('/games/blackjack/action', {
        action: act, playerHand, dealerHand, deck, betPoints: bet,
      });
      setPlayerHand(data.playerHand);
      setDealerHand(data.dealerHand);
      setDeck(data.deck);
      if (data.result) {
        setResult(data.result);
        setWinPoints(data.winPoints);
        setPhase('done');
        if (data.winPoints > 0) toast.success(`🃏 ${data.result === 'blackjack' ? 'BLACKJACK!' : 'Vitória!'} +${formatPoints(data.winPoints)}`);
        else if (data.result === 'push') toast.success('🤝 Empate!');
        else toast.error('😢 Dealer ganhou');
        refresh();
      }
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
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

  const reset = () => { setPhase('bet'); setPlayerHand([]); setDealerHand([]); setResult(null); setWinPoints(0); };

  return (
    <div className="max-w-xl mx-auto">
      {/* Table */}
      <div className="rounded-xl p-6 mb-4 min-h-64 flex flex-col items-center gap-4 border border-border"
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
          <div className="text-white/30 text-sm flex items-center gap-2">🃏 Configura e inicia</div>
        )}
        {result && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className={`px-5 py-2 rounded-full font-black text-base
              ${result === 'win' || result === 'blackjack' ? 'bg-success/30 text-success' :
                result === 'push' ? 'bg-orange/30 text-orange' : 'bg-red/30 text-red'}`}
          >
            {result === 'blackjack' ? '🃏 BLACKJACK!' :
             result === 'win'       ? '🎉 Vitória!' :
             result === 'push'      ? '🤝 Empate' :
             result === 'bust'      ? '💥 Bust!' : '😢 Dealer ganhou'}
          </motion.div>
        )}
      </div>

      <Card>
        <Input label="💎 Aposta (pts)" type="number" min="1" step="1" value={bet}
          onChange={e => setBet(+e.target.value)} disabled={phase === 'play'} />
        <div className="flex gap-2 flex-wrap">
          {phase === 'bet'  && <Button onClick={deal} className="flex-1">🃏 Distribuir</Button>}
          {phase === 'play' && <>
            <Button onClick={() => action('hit')} className="flex-1">Hit</Button>
            <Button variant="secondary" onClick={() => action('stand')} className="flex-1">Stand</Button>
            {playerHand.length === 2 && <Button variant="secondary" onClick={() => action('double')} className="flex-1">Double</Button>}
          </>}
          {phase === 'done' && <Button variant="secondary" onClick={reset} className="flex-1">🔄 Nova Mão</Button>}
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
  const ITEM_W = 88; // px (80px item + 8px gap)
  const WINNING_INDEX = 45;

  // Carrega a lista de caixas disponíveis (com os seus itens reais) ao montar
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

      // Construir o rolo de animação usando os itens REAIS desta caixa
      // O item sorteado fica exatamente no índice WINNING_INDEX (45),
      // que é o índice para o qual o cálculo de "target" abaixo aponta.
      const caseItems = selectedCase.items || [];
      const reel = Array(60).fill(null).map(() => caseItems[Math.floor(Math.random() * caseItems.length)]);
      reel[WINNING_INDEX] = data.item;
      setReelItems(reel);
      setReelOffset(0);

      // Largura real do contentor visível (a roleta) — necessária para
      // centrar o item ganho exatamente debaixo do seletor laranja.
      const containerWidth = reelContainerRef.current?.offsetWidth || 600;
      const INNER_PADDING = 8; // px — corresponde ao "p-2" do contentor interno do rolo
      // Posição do centro do item WINNING_INDEX dentro do rolo (já com o padding):
      const itemCenter = INNER_PADDING + WINNING_INDEX * ITEM_W + ITEM_W / 2;
      // Deslocamento necessário para esse centro coincidir com o centro do contentor:
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
      {/* Seleção de caixa */}
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

      {/* Tabela de probabilidades + pontos da caixa selecionada */}
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


// Ordem real dos números na roda física europeia (não é sequencial 0-36!)
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

export function RouletteGame() {
  const { refresh } = useGame();
  // bets = { 'color:red': amount, 'number:17': amount, 'parity:even': amount, 'dozen:1': amount, 'half:low': amount }
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

  // Converte o dicionário local de apostas (chave "tipo:valor") no formato
  // de array que o backend espera.
  function buildBetsPayload() {
    return Object.entries(bets).map(([key, amount]) => {
      const [type, value] = key.split(':');
      return { type, value: type === 'number' ? Number(value) : value, amount };
    });
  }

  const spin = async () => {
    const serverBets = buildBetsPayload();
    if (!serverBets.length) return toast.error('Faz pelo menos uma aposta');
    setSpinning(true);
    setResult(null);
    try {
      const { data } = await api.post('/games/roulette', { bets: serverBets });

      const idx = WHEEL_ORDER.indexOf(data.winningNumber);
      const segAngle = 360 / 37;
      // Para a roda parar com o número vencedor debaixo do marcador (12h),
      // precisamos que a rotação final seja: 360*N - (idx * segAngle + segAngle/2)
      // Como usamos acumulação, calculamos quantas voltas completas já demos
      // e construímos o próximo target absoluto a partir daí.
      setRotation(prev => {
        const fullRotations = Math.ceil(prev / 360) * 360 + 360 * 5;
        return fullRotations - (idx * segAngle + segAngle / 2);
      });

      setTimeout(() => {
        setSpinning(false);
        setResult(data);
        setBets({});
        refresh();
        if (data.totalWon > 0) toast.success(`🎉 Número ${data.winningNumber}! +${formatPoints(data.totalWon)}`);
        else toast.error(`😢 Saiu o ${data.winningNumber} (${data.winningColor})`);
      }, 4200);
    } catch (err) {
      setSpinning(false);
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const numbers = Array.from({ length: 37 }, (_, i) => i);
  const segAngle = 360 / 37;

  // Grelha 3x12 estilo mesa real: linhas de baixo (1,4,7...) para cima (3,6,9...)
  const ROWS = [
    [3,6,9,12,15,18,21,24,27,30,33,36],
    [2,5,8,11,14,17,20,23,26,29,32,35],
    [1,4,7,10,13,16,19,22,25,28,31,34],
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-5">

        {/* ── COLUNA ESQUERDA: roda + ficha + botão girar ── */}
        <div>
          <Card className="text-center overflow-visible" style={{ background: 'radial-gradient(circle at 50% 30%, #2a1530, #150a18)' }}>
            <div className="relative w-full aspect-square max-w-[400px] mx-auto mb-4 flex items-center justify-center">

              {/* Aro exterior dourado/castanho (bisel) */}
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, #3d2410, #6b4423, #3d2410, #6b4423, #3d2410)',
                  boxShadow: '0 0 0 4px #1a0f08, 0 12px 40px rgba(0,0,0,.6), inset 0 0 30px rgba(0,0,0,.5)',
                }}
              />

              {/* Roda giratória com os 37 segmentos na ordem física real */}
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
                {/* Números sobre cada segmento */}
                {WHEEL_ORDER.map((n, i) => (
                  <div key={n} className="absolute inset-0 flex justify-center"
                    style={{ transform: `rotate(${i * segAngle + segAngle / 2}deg)` }}>
                    <span className="text-white font-bold select-none" style={{ fontSize: '0.6rem', marginTop: '3%' }}>{n}</span>
                  </div>
                ))}
              </motion.div>

              {/* Bola — fixa no topo, a roda roda por baixo dela */}
              <div className="absolute" style={{ inset: 0 }}>
                <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                  style={{ top: '7%', background: 'radial-gradient(circle at 35% 30%, #fff, #ccc)', boxShadow: '0 1px 4px rgba(0,0,0,.6)' }} />
              </div>

              {/* Cubo central dourado */}
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

          {/* Valor da ficha de aposta */}
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

          {/* Apostas atuais */}
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

        {/* ── COLUNA DIREITA: mesa de apostas estilo casino real ── */}
        <div>
          <Card>
            <h3 className="font-bold text-sm mb-3">🎯 Mesa de Apostas — clica para apostar</h3>

            <div className="flex border border-border2 rounded-card overflow-hidden">
              {/* Coluna do zero */}
              <button disabled={spinning} onClick={() => addBet('number', 0)}
                className={`relative w-10 flex-shrink-0 flex items-center justify-center text-sm font-bold text-white border-2
                  transition-all ${bets['number:0'] ? 'border-orange' : 'border-transparent hover:brightness-110'}`}
                style={{ background: COLOR_HEX.green }}>
                0
                {bets['number:0'] && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange text-black text-[9px] font-black rounded-full flex items-center justify-center">{bets['number:0']}</span>}
              </button>

              {/* Grelha 3x12 */}
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

            {/* Dúzias */}
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

            {/* Apostas exteriores: 1-18 / Par / Vermelho / Preto / Ímpar / 19-36 */}
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

          {/* Resultados detalhados da última jogada */}
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
  const { refresh } = useGame();
  const [bet, setBet] = useState(50);
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState('over');
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [displayRoll, setDisplayRoll] = useState(50); // Para o efeito de embaralhar números

  const chance = direction === 'over' ? (100 - target) : (target - 1);
  const edge = 0.01;
  const multiplier = chance > 0 ? Math.floor((1 / (chance / 100)) * (1 - edge) * 100) / 100 : 0;

  // Efeito visual de embaralhar números enquanto rola (Efeito clássico de casino)
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
    setRolling(true);
    setResult(null);
    try {
      const { data } = await api.post('/games/dice', { betPoints: bet, target, direction });
      
      // Pequeno delay intencional na animação para criar suspense
      setTimeout(() => {
        setResult(data);
        setDisplayRoll(data.roll);
        refresh();
        if (data.won) {
          toast.success(`🎉 Ganhastes +${formatPoints(data.winPoints)}!`);
        } else {
          toast.error('❌ Não foi desta vez!');
        }
        setRolling(false);
      }, 700);

    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
      setRolling(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Card className="bg-[#0f141c] border border-slate-800 text-white">
        
        {/* Ecrã Superior de Live Roll */}
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

        {/* Stats Grid Estilizada */}
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

        {/* Interactive Advanced Slider Bar */}
        <div className="mb-8 relative pt-6">
          <div className="relative h-4 bg-[#1a2232] rounded-full border border-slate-800 shadow-inner">
            
            {/* Zona Vermelha / Verde Dinâmica */}
            <div 
              className={`absolute inset-y-0 left-0 rounded-l-full transition-colors duration-300 ${direction === 'under' ? 'bg-emerald-500 bg-success' : 'bg-red-500'}`}
              style={{ width: `${target}%` }}
            />
            <div 
              className={`absolute inset-y-0 right-0 rounded-r-full transition-colors duration-300 ${direction === 'over' ? 'bg-emerald-500 bg-success' : 'bg-red-500'}`}
              style={{ width: `${100 - target}%` }}
            />

            {/* Marcador do pino central do Alvo */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-150 pointer-events-none"
              style={{ left: `${target}%` }}
            >
              <div className="w-5 h-7 bg-white rounded-md shadow-lg border border-slate-300 flex items-center justify-center text-[10px] font-black text-black">
                ⋮
              </div>
            </div>

            {/* Marcador Flutuante do Último Resultado Real */}
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

            {/* Input Range Invisível (Para clique/arrasto perfeito) */}
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

          {/* Marcadores de Escala na Base */}
          <div className="flex justify-between text-[10px] text-slate-500 font-bold px-1 mt-2 select-none">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* Seleção Alternada de Direção (Over / Under) */}
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

        {/* Inputs de Quantia */}
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

        {/* Botão de Disparo */}
        <Button onClick={roll} loading={rolling} className="w-full py-3.5 text-sm font-bold uppercase tracking-wider">
          🎲 Lançar — {formatPoints(bet)}
        </Button>
      </Card>
    </div>
  );
}

// ── PLINKO ─────────────────────────────────────────────────────────────────────
const PLINKO_MULTS = {
  8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  12: [10, 3, 1.6, 1.4, 1.1, 1.0, 1.1, 1.4, 1.6, 3, 10],
  16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
};

function multColor(m) {
  if (m >= 10) return '#f59e0b';
  if (m >= 3)  return '#8b5cf6';
  if (m >= 1.5) return '#3b82f6';
  if (m >= 1)  return '#10b981';
  return '#6b7280';
}

export function PlinkoGame() {
  const { refresh } = useGame();
  const [bet, setBet] = useState(50);
  const [rows, setRows] = useState(16);
  
  // Array de bolas ativas no ecrã para permitir cliques múltiplos rápidos
  const [balls, setBalls] = useState([]);
  // Guarda o último resultado para o painel inferior de estatísticas
  const [lastResult, setLastResult] = useState(null);
  // Animação visual de impacto nos multiplicadores
  const [activeBucket, setActiveBucket] = useState(null);

  // Função matemática para gerar a rota realista da bola baseada no destino final (data.position)
  const generatePhysicsPath = (finalColumn, totalRows) => {
    let currentColumn = 0;
    const path = [];
    
    // Calcula o número total de desvios para a direita que a bola TEM de fazer
    // Num triângulo Plinko, a coluna final é exatamente o número de desvios para a direita acumulados.
    let remainingRights = finalColumn;

    for (let r = 0; r < totalRows; r++) {
      const remainingRows = totalRows - r;
      let goRight = false;

      if (remainingRights >= remainingRows) {
        goRight = true;
      } else if (remainingRights > 0) {
        goRight = Math.random() > 0.5;
      }

      if (goRight) {
        currentColumn++;
        remainingRights--;
      }

      // Converte a linha e coluna atual em percentagens (X, Y) dentro do tabuleiro
      const totalPegsInRow = r + 3; 
      const centerXOffset = 50; 
      const stepX = 4.5; // Espaçamento horizontal proporcional
      const xPercent = centerXOffset + (currentColumn - (totalPegsInRow - 1) / 2) * stepX;
      const yPercent = ((r + 1) / (totalRows + 1)) * 82;

      path.push({ x: `${xPercent}%`, y: `${yPercent}%` });
    }

    // Ponto de queda final dentro da caixa (alinhado perfeitamente com o multiplicador)
    const finalX = (finalColumn / finalColumn === 0 ? 0 : (finalColumn / totalRows) * 90) + (5 + (16 - totalRows) * 0.3);
    path.push({ x: `${finalX}%`, y: '96%' });

    return path;
  };

  const dropBall = async () => {
    // Geramos um ID único para cada bola para permitir múltiplos cliques sem interferência
    const ballId = Date.now() + Math.random();
    
    try {
      const { data } = await api.post('/games/plinko', { betPoints: bet, rows });
      
      // Constrói a rota física em tempo real antes de renderizar a bola
      const keyframes = generatePhysicsPath(data.position, rows);
      
      const newBall = {
        id: ballId,
        keyframesX: keyframes.map(p => p.x),
        keyframesY: keyframes.map(p => p.y),
        targetPosition: data.position,
        data: data
      };

      setBalls(prev => [...prev, newBall]);

    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const handleBallComplete = (ball) => {
    setLastResult(ball.data);
    setActiveBucket(ball.targetPosition);
    refresh();

    if (ball.data.winPoints > 0) {
      toast.success(`🎯 ${ball.data.multiplier}x! +${formatPoints(ball.data.winPoints)}`);
    } else {
      toast.error('Sem multiplicador desta vez');
    }

    // Remove a bola do estado após o impacto e desliga o brilho do bucket após 200ms
    setTimeout(() => setActiveBucket(null), 200);
    setBalls(prev => prev.filter(b => b.id !== ball.id));
  };

  const mults = PLINKO_MULTS[rows] || PLINKO_MULTS[16];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <h3 className="font-bold mb-2 text-center text-lg tracking-wide text-white">🪂 Plinko Premium</h3>

        {/* Tabuleiro Dinâmico */}
        <div className="relative bg-[#0f141c] border border-slate-800 rounded-xl p-4 mb-4 overflow-hidden shadow-inner flex flex-col justify-between" style={{ height: '420px' }}>
          
          {/* Matriz Real de Pinos Dinâmicos baseada no número de linhas selecionado */}
          <div className="flex flex-col justify-between h-[82%] mt-4 select-none">
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="flex justify-center items-center" style={{ gap: `${26 - rows * 0.8}px` }}>
                {Array.from({ length: r + 3 }, (_, c) => (
                  <div 
                    key={c} 
                    className="w-2 h-2 rounded-full bg-slate-400 shadow-[0_0_4px_rgba(255,255,255,0.6)] border border-slate-600 transition-all duration-300" 
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Renderização em Tempo Real de Múltiplas Bolas */}
          {balls.map((ball) => (
            <motion.div
              key={ball.id}
              className="absolute w-3.5 h-3.5 rounded-full bg-red-500 border border-white shadow-[0_0_8px_#ef4444] z-20"
              initial={{ top: '2%', left: '50%', x: '-50%', y: 0 }}
              animate={{
                left: ball.keyframesX,
                top: ball.keyframesY,
              }}
              transition={{
                duration: rows * 0.11, // Velocidade fluida proporcional à altura do tabuleiro
                ease: 'linear',
              }}
              onAnimationComplete={() => handleBallComplete(ball)}
            />
          ))}

          {/* Contentores de Multiplicadores na Base */}
          <div className="flex gap-[3px] w-full mt-auto z-10 px-1">
            {mults.map((m, i) => {
              const isActive = activeBucket === i;
              return (
                <motion.div 
                  key={i}
                  animate={isActive ? { scale: 1.25, zIndex: 30 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="flex-1 text-center py-2.5 rounded-md text-[10px] font-black transition-all shadow-md select-none"
                  style={{ 
                    background: isActive ? multColor(m) : multColor(m) + '24', 
                    color: isActive ? '#000' : multColor(m), 
                    border: `1px solid ${multColor(m)}${isActive ? 'ff' : '66'}`,
                    boxShadow: isActive ? `0 0 15px ${multColor(m)}` : 'none'
                  }}
                >
                  {m < 10 ? m.toFixed(1) : Math.floor(m)}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Badge do Último Resultado */}
        {lastResult && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-center">
            <Badge color={lastResult.winPoints > 0 ? 'green' : 'red'}>
              {lastResult.winPoints > 0 ? `📊 Último Ganho: ${lastResult.multiplier}x (+$ {formatPoints(lastResult.winPoints)})` : `❌ Último Resultado: ${lastResult.multiplier}x`}
            </Badge>
          </motion.div>
        )}

        {/* Seleção de Linhas (Dinâmica) */}
        <div className="flex gap-2 mb-4 bg-[#1a222f] p-1.5 rounded-xl border border-slate-800">
          {[8, 12, 16].map(r => (
            <button 
              key={r} 
              disabled={balls.length > 0} // Impede mudar de linhas se houver bolas em queda para não quebrar a física
              onClick={() => setRows(r)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all
                ${rows === r 
                  ? 'bg-orange text-black border-orange shadow-md' 
                  : 'bg-transparent text-slate-400 border-transparent hover:text-white disabled:opacity-30'}`}
            >
              {r} Linhas
            </button>
          ))}
        </div>

        {/* Inputs de Valores de Aposta */}
        <div className="flex gap-3 mb-4">
          <input 
            type="number" 
            min="1" 
            value={bet} 
            onChange={e => setBet(Math.max(1, +e.target.value))}
            className="flex-1 bg-bg3 border border-border2 text-white rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-orange" 
          />
          {[10, 50, 100, 500].map(v => (
            <button 
              key={v} 
              onClick={() => setBet(v)}
              className="px-3 py-2 rounded-lg bg-bg4 border border-border text-xs font-semibold hover:border-orange text-slate-300 transition-colors"
            >
              {v}
            </button>
          ))}
        </div>

        {/* Botão de Disparo */}
        <Button onClick={dropBall} className="w-full py-3.5 text-sm font-bold uppercase tracking-wider">
          🟢 Soltar Bola — {formatPoints(bet)}
        </Button>
      </Card>
    </div>
  );
}

// ── VÍDEO POKER ────────────────────────────────────────────────────────────────
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
  { hand: 'jacks-or-better',payout: 1   },
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
  const { refresh } = useGame();
  const [bet, setBet] = useState(50);
  const [phase, setPhase] = useState('bet'); // bet | hold | done
  const [hand, setHand] = useState([]);
  const [deck, setDeck] = useState([]);
  const [held, setHeld] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const deal = async () => {
    setLoading(true);
    setResult(null);
    setHeld([]);
    try {
      const { data } = await api.post('/games/poker/deal', { betPoints: bet });
      setHand(data.hand);
      setDeck(data.deck);
      setPhase('hold');
    } catch (err) {
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
    try {
      const { data } = await api.post('/games/poker/hold', { hand, deck, held, betPoints: bet });
      setHand(data.finalHand);
      setResult(data);
      setPhase('done');
      refresh();
      if (data.winPoints > 0) toast.success(`🃏 ${HAND_LABELS[data.handName]?.label}! +${formatPoints(data.winPoints)}`);
      else toast.error('Sem jogo desta vez');
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Tabela de pagamentos */}
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
        {/* Mão de cartas */}
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
  );
}

// ── SLOTS ──────────────────────────────────────────────────────────────────────
const SYMBOL_COLORS = {
  cherry: '#ef4444', lemon: '#eab308', orange: '#f97316', grape: '#8b5cf6',
  melon: '#10b981', bell: '#f59e0b', star: '#3b82f6', diamond: '#06b6d4', seven: '#dc2626',
};

export function SlotsGame() {
  const { refresh } = useGame();
  const [bet, setBet] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [displayReels, setDisplayReels] = useState([{ emoji: '❓' }, { emoji: '❓' }, { emoji: '❓' }]);
  const [result, setResult] = useState(null);
  const [animatingReels, setAnimatingReels] = useState([false, false, false]);

  const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎', '7️⃣'];

  const spin = async () => {
    setSpinning(true);
    setResult(null);
    setAnimatingReels([true, true, true]);

    // Loop rápido de símbolos aleatórios para simular a rotação
    const interval = setInterval(() => {
      setDisplayReels([
        { emoji: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] },
        { emoji: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] },
        { emoji: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] },
      ]);
    }, 60);

    try {
      const { data } = await api.post('/games/slots', { betPoints: bet });

      // Sequência de travagem realista (Rolo 1 -> Rolo 2 -> Rolo 3)
      setTimeout(() => {
        clearInterval(interval);
        
        // Para Rolo 1
        setAnimatingReels([false, true, true]);
        setDisplayReels(prev => [data.reels[0], prev[1], prev[2]]);

        setTimeout(() => {
          // Para Rolo 2
          setAnimatingReels([false, false, true]);
          setDisplayReels(prev => [data.reels[0], data.reels[1], prev[2]]);

          setTimeout(() => {
            // Para Rolo 3
            setAnimatingReels([false, false, false]);
            setDisplayReels([data.reels[0], data.reels[1], data.reels[2]]);
            
            // Define o resultado final e dispara os efeitos visuais
            setResult(data);
            refresh();
            
            if (data.winPoints > 0) {
              toast.success(`🎰 ${data.multiplier}x! +${formatPoints(data.winPoints)}`);
            } else {
              toast.error('Tenta de novo!');
            }
            setSpinning(false);
          }, 450);
        }, 450);
      }, 1000);

    } catch (err) {
      clearInterval(interval);
      setSpinning(false);
      setAnimatingReels([false, false, false]);
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card className="bg-[#0f141c] border border-slate-800 text-white overflow-hidden p-5">
        
        {/* Cabeçalho Neon */}
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

        {/* Chassis da Máquina de Slots */}
        <div 
          className={`bg-[#0a0d14] border-2 rounded-2xl p-5 mb-5 relative transition-all duration-300 ${
            spinning 
              ? 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]' 
              : result?.winPoints > 0 
                ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.25)] animate-bounce' 
                : 'border-slate-800 shadow-inner'
          }`}
        >
          {/* Luzes Laterais Decorativas de Casino */}
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

          {/* Compartimento dos Rolos (Reels Container) */}
          <div className="flex gap-3.5 justify-center items-center px-2">
            {displayReels.map((reel, i) => {
              const isAnim = animatingReels[i];
              return (
                <div 
                  key={i} 
                  className="w-24 h-24 bg-[#141a26] border border-slate-800 rounded-xl flex items-center justify-center overflow-hidden relative"
                  style={{ boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.6)' }}
                >
                  {/* Linha guia de mira de fundo */}
                  <div className="absolute inset-x-0 h-px bg-slate-800/50 top-1/2 -translate-y-1/2 pointer-events-none" />
                  
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={reel?.emoji + i + isAnim}
                      className="text-5xl select-none block filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                      initial={isAnim ? {} : { scale: 0.4, y: -20, opacity: 0 }}
                      animate={isAnim ? {
                        y: [-12, 12],
                        filter: 'blur(3px)', // Motion Blur perfeito em CSS
                        scale: 0.95
                      } : { 
                        scale: [1.2, 1], // Pequeno bounce elástico ao parar
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

          {/* Linha Guia Central Transparente */}
          <div className="mt-4 flex items-center gap-2 justify-center opacity-70">
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-orange/40" />
            <span className="text-orange text-[9px] font-black tracking-widest uppercase">Payline</span>
            <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-orange/40" />
          </div>
        </div>

        {/* Banner de Estado ou Feedback de Ganhos */}
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

        {/* Tabela de Símbolos / Multiplicadores Estilizada */}
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
              className="bg-[#141a26] border border-slate-900 rounded-xl p-1.5 flex flex-col items-center justify-center transition-colors hover:border-slate-800"
            >
              <span className="text-xl mb-0.5 filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)] select-none">{sym.s}</span>
              <span className="text-[10px] font-black tracking-tight" style={{ color: SYMBOL_COLORS[sym.id] }}>
                {sym.m}
              </span>
            </div>
          ))}
        </div>

        {/* Painel de Controlo Inferior */}
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

        {/* Botão de Ação */}
        <Button 
          onClick={spin} 
          loading={spinning} 
          className="w-full py-4 text-sm font-black uppercase tracking-widest shadow-lg active:scale-[0.99] transition-transform"
        >
          🎰 {spinning ? 'A Rodar...' : `Girar Rolos — ${formatPoints(bet)}`}
        </Button>
      </Card>
    </div>
  );
}

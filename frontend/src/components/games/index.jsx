import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useGame } from '../../context/AuthContext';
import { Button, Card, Input, Select, Badge, Spinner } from '../ui';
import { formatPoints, RARITY_COLORS, RARITY_BG } from '../../utils/constants';

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

  const flip = async () => {
    if (!choice) return toast.error('Escolhe Cara ou Coroa');
    setFlipping(true);
    setResult(null);
    try {
      const { data } = await api.post('/games/coinflip', { betPoints: bet, choice });
      setTimeout(() => {
        setResult(data);
        setFlipping(false);
        refresh();
        if (data.won) toast.success(`🎉 Ganhastes! +${formatPoints(data.winPoints)}`);
        else toast.error(`😢 Perdeste ${formatPoints(bet)}`);
      }, 900);
    } catch (err) { setFlipping(false); toast.error(err.response?.data?.error || err.message); }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="text-center">
        <motion.div
          animate={flipping ? { rotateY: [0, 720] } : {}}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl border-4"
          style={{
            background: result ? (result.result === 'heads' ? 'linear-gradient(135deg,#d4af37,#f5d563)' : 'linear-gradient(135deg,#6b7280,#9ca3af)') : 'var(--bg4)',
            borderColor: result ? (result.result === 'heads' ? '#d4af37' : '#6b7280') : 'var(--border2)',
          }}
        >
          {flipping ? '🪙' : result ? (result.result === 'heads' ? '👑' : '🦅') : '🪙'}
        </motion.div>

        <div className="flex gap-3 justify-center mb-5">
          {[{id:'heads',icon:'👑',label:'Cara'},{id:'tails',icon:'🦅',label:'Coroa'}].map(c => (
            <button key={c.id} onClick={() => setChoice(c.id)}
              className={`flex-1 py-3 rounded-[10px] font-bold border-2 text-sm transition-all
                ${choice === c.id ? 'border-orange bg-orange/10 text-orange' : 'border-border2 bg-bg4 hover:border-border text-text2'}`}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        <Input label="💎 Aposta (pts)" type="number" min="1" step="1" value={bet}
          onChange={e => setBet(+e.target.value)} disabled={flipping} />
        <Button onClick={flip} loading={flipping} disabled={!choice} className="w-full py-3 mt-1">
          🎯 Lançar Moeda
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-3 rounded-[10px] font-bold ${result.won ? 'bg-success/10 text-success' : 'bg-red/10 text-red'}`}
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
  const { refresh } = useGame();
  const [bet, setBet]   = useState(50);
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(null);
  const [running, setRunning]   = useState(false);
  const [crashed, setCrashed]   = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [betIn, setBetIn]       = useState(false);
  const [history, setHistory]   = useState([1.23, 3.45, 1.01, 8.92, 2.11]);
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
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
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
    } catch (err) { toast.error(err.response?.data?.error || err.message); }
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const multColor = crashed ? 'var(--red)' : cashedOut ? 'var(--green)' : multiplier < 2 ? 'var(--green)' : multiplier < 5 ? 'var(--orange)' : 'var(--red)';

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <div className="flex gap-2 mb-4 flex-wrap">
          {history.map((h, i) => (
            <Badge key={i} color={h < 2 ? 'red' : h < 5 ? 'orange' : 'green'}>{h.toFixed(2)}x</Badge>
          ))}
        </div>
        <div className="h-44 bg-bg4 rounded-xl flex items-center justify-center relative overflow-hidden mb-4 border border-border">
          {crashed && <span className="absolute top-3 right-3 text-red text-xs font-bold">💥 CRASHED</span>}
          {cashedOut && <span className="absolute top-3 right-3 text-success text-xs font-bold">✅ CASHOUT</span>}
          <motion.div
            key={Math.floor(multiplier * 10)}
            className="text-6xl font-black tracking-tight"
            style={{ color: multColor }}
            animate={running && !crashed ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.4 }}
          >
            {multiplier.toFixed(2)}x
          </motion.div>
        </div>
        <Input label="💎 Aposta (pts)" type="number" min="1" step="1" value={bet}
          onChange={e => setBet(+e.target.value)} disabled={running} />
        <div className="flex gap-3">
          <Button onClick={startRound} disabled={running} className="flex-1 py-3">🚀 Iniciar</Button>
          <Button onClick={cashout} disabled={!running || cashedOut}
            className="flex-1 py-3" style={{ background: 'var(--green)', color: '#fff' }}>
            💵 Cashout — {formatPoints(bet * multiplier)}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── BLACKJACK ─────────────────────────────────────────────────────────────────
function PlayingCard({ card, faceDown }) {
  return (
    <div
      style={!faceDown ? { color: card?.red ? '#dc2626' : '#111827' } : {}}
      className={`w-14 h-20 rounded-lg flex items-center justify-center text-lg font-bold
        border shadow-card flex-shrink-0
        ${faceDown ? 'bg-gradient-to-br from-blue/40 to-purple/40 border-border2' : 'bg-white border-gray-200'}`}
    >
      {faceDown ? '' : (card?.v && card?.s) ? `${card.v}${card.s}` : ''}
    </div>
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

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { X, Trash2, Trophy } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Card, Badge, Button, Spinner } from '../components/ui';
import { formatPoints } from '../utils/constants';
import api from '../utils/api';

// ── Contagem decrescente até ao início do jogo ──────────────────────────────
function useCountdown(targetIso) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetIso) - new Date();
      if (diff <= 0) { setLabel('A começar'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return label;
}

// ── Cartão de jogo, estilo casa de apostas ──────────────────────────────────
function FixtureCard({ fixture, selection, onSelect }) {
  const countdown = useCountdown(fixture.kickoffAt);
  const isFinished = fixture.status === 'finished';
  const isLive = fixture.status === 'live';
  const kickoff = new Date(fixture.kickoffAt);
  const isToday = kickoff.toDateString() === new Date().toDateString();

  const pick = (market) => {
    if (isFinished) return;
    onSelect(fixture, market);
  };

  const isSelected = (market) => selection?.fixtureId === fixture.id && selection?.market === market;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple/10 via-bg3 to-bg3 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-bg4 flex items-center justify-center flex-shrink-0">
          <Trophy size={16} className="text-orange" />
        </div>
        <span className="font-bold text-sm flex-1 truncate">{fixture.competition}</span>
        {isLive && <Badge color="red">🔴 AO VIVO</Badge>}
        {isFinished && <Badge color="gray">Terminado</Badge>}
      </div>

      <div className="p-5">
        {fixture.roundLabel && (
          <div className="flex items-center gap-2 text-xs text-text2 mb-4">
            <Trophy size={12} className="text-orange" /> {fixture.roundLabel}
          </div>
        )}

        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 text-center">
           <img src={fixture.homeLogo} alt={fixture.home} crossOrigin="anonymous" referrerPolicy="no-referrer" className="w-16 h-16 mx-auto mb-2 object-contain rounded-full border border-border2" />
            <div className="font-bold text-sm">{fixture.home}</div>
          </div>

          <div className="text-center flex-shrink-0 min-w-[90px]">
            {isFinished ? (
              <div className="text-2xl font-black">{fixture.goalsHome} - {fixture.goalsAway}</div>
            ) : (
              <>
                <div className="text-lg font-black text-white">
                  {kickoff.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-text2 mb-1">{isToday ? 'Hoje' : kickoff.toLocaleDateString('pt-PT')}</div>
                {!isLive && <div className="text-xs text-orange font-mono font-bold">{countdown}</div>}
              </>
            )}
          </div>

          <div className="flex-1 text-center">
            <img src={fixture.awayLogo} alt={fixture.away} className="w-16 h-16 mx-auto mb-2 object-contain rounded-full border border-border2" />
            <div className="font-bold text-sm">{fixture.away}</div>
          </div>
        </div>

        {!isFinished && (
          <div className="bg-bg4 rounded-card2 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-sm">Quem ganhará?</div>
                <div className="text-text3 text-xs">Dá o teu palpite!</div>
              </div>
              <Trophy size={20} className="text-text3" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => pick('home')}
                className={`rounded-full py-3 px-2 flex items-center justify-center transition-all border-2
                  ${isSelected('home') ? 'border-orange bg-orange/10' : 'border-transparent bg-white/95 hover:bg-white'}`}>
                <img src={fixture.homeLogo} alt="" className="w-7 h-7 object-contain rounded-full" />
              </button>
              <button onClick={() => pick('draw')}
                className={`rounded-full py-3 px-2 flex items-center justify-center font-bold text-sm transition-all border-2
                  ${isSelected('draw') ? 'border-orange bg-orange/10 text-orange' : 'border-transparent bg-white/95 hover:bg-white text-bg'}`}>
                X
              </button>
              <button onClick={() => pick('away')}
                className={`rounded-full py-3 px-2 flex items-center justify-center transition-all border-2
                  ${isSelected('away') ? 'border-orange bg-orange/10' : 'border-transparent bg-white/95 hover:bg-white'}`}>
                <img src={fixture.awayLogo} alt="" className="w-7 h-7 object-contain rounded-full" />
              </button>
            </div>
          </div>
        )}

        <div className="rounded-card2 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-purple/20 via-bg4 to-bg4">
            <span className="text-xs font-semibold text-text2">Tempo regulamentar</span>
          </div>
          <div className="grid grid-cols-3 gap-px bg-border">
            {[
              { key: 'home', label: '1', odd: fixture.odds.home },
              { key: 'draw', label: 'X', odd: fixture.odds.draw },
              { key: 'away', label: '2', odd: fixture.odds.away },
            ].map(o => (
              <button key={o.key} disabled={isFinished} onClick={() => pick(o.key)}
                className={`py-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed
                  ${isSelected(o.key) ? 'bg-orange text-black' : 'bg-bg4 text-white hover:bg-bg3'}`}>
                {o.label} <span className="ml-1">{Number(o.odd).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Boletim lateral ───────────────────────────────────────────────────────────
function BetSlip({ selections, onRemove, onClear, onPlaced }) {
  const { user, refresh } = useGame();
  const [stake, setStake] = useState(50);
  const [placing, setPlacing] = useState(false);

  const combinedOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialWin = Math.round(stake * combinedOdds);
  const isMultiple = selections.length > 1;

  const place = async () => {
    if (!selections.length) return;
    if (stake < 1) return toast.error('Aposta mínima de 1 ponto');
    setPlacing(true);
    try {
      const { data } = await api.post('/bets/place', {
        stake,
        selections: selections.map(s => ({
          fixtureId: s.fixtureId, fixtureLabel: s.fixtureLabel,
          selection: s.market, selectionLabel: s.selectionLabel, odds: s.odds,
        })),
      });
      toast.success(`🎉 ${data.message} Potencial: ${formatPoints(data.potentialWin)}`);
      await refresh();
      onPlaced();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao colocar aposta');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Card className="sticky top-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm flex items-center gap-1.5">
          🎫 Boletim {isMultiple && <Badge color="purple">Múltipla</Badge>}
        </h3>
        {selections.length > 0 && (
          <button onClick={onClear} className="text-text3 hover:text-red transition-colors"><Trash2 size={14} /></button>
        )}
      </div>

      {selections.length === 0 ? (
        <p className="text-text3 text-xs text-center py-8">Clica num palpite ou odd para adicionar ao boletim</p>
      ) : (
        <>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {selections.map((s, i) => (
              <div key={i} className="bg-bg4 border border-border rounded-[10px] p-2.5 relative">
                <button onClick={() => onRemove(s.fixtureId)}
                  className="absolute top-2 right-2 text-text3 hover:text-red transition-colors"><X size={12} /></button>
                <div className="text-xs font-semibold truncate pr-5">{s.fixtureLabel}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-text2">{s.selectionLabel}</span>
                  <span className="text-xs font-bold text-orange">{s.odds.toFixed(2)}x</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-text2 mb-2">
            <span>Odd combinada</span>
            <span className="font-bold text-orange">{combinedOdds.toFixed(2)}x</span>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-text2 mb-1.5">💎 Aposta (pts)</label>
            <input type="number" min="1" step="1" value={stake}
              onChange={e => setStake(Math.max(1, +e.target.value))}
              className="w-full bg-bg3 border border-border2 text-white rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:border-orange" />
          </div>

          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-text2">Ganho potencial</span>
            <span className="font-black text-success">{formatPoints(potentialWin)}</span>
          </div>

          <Button onClick={place} loading={placing} disabled={(user?.points || 0) < stake} className="w-full py-3">
            {(user?.points || 0) < stake ? 'Pontos insuficientes' : `Apostar ${formatPoints(stake)}`}
          </Button>
        </>
      )}
    </Card>
  );
}

// ── Minhas Apostas ────────────────────────────────────────────────────────────
function MyBets({ refreshKey }) {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/bets/mine').then(({ data }) => setSlips(data.slips || [])).finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (!slips.length) return <p className="text-text3 text-sm text-center py-8">Ainda não fizeste nenhuma aposta</p>;

  return (
    <div className="space-y-3">
      {slips.map(slip => (
        <Card key={slip.id}>
          <div className="flex items-center gap-2 mb-2">
            <Badge color={
              slip.status === 'pending' ? 'blue' : slip.status === 'won' ? 'green' :
              slip.status === 'void' ? 'purple' : 'red'
            }>
              {slip.status === 'pending' ? '⏳ Pendente' : slip.status === 'won' ? '✅ Ganhou' :
               slip.status === 'void' ? '↩️ Anulada' : '❌ Perdeu'}
            </Badge>
            {slip.selections.length > 1 && <Badge color="purple">Múltipla ({slip.selections.length})</Badge>}
            <span className="text-xs text-text3 ml-auto">{new Date(slip.placed_at).toLocaleString('pt-PT')}</span>
          </div>
          <div className="space-y-1 mb-2">
            {slip.selections.map(sel => (
              <div key={sel.id} className="flex items-center justify-between text-xs">
                <span className="text-text2 truncate">{sel.fixture_label} — {sel.selection_label}</span>
                <span className="font-semibold text-orange flex-shrink-0 ml-2">{parseFloat(sel.odds).toFixed(2)}x</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
            <span className="text-text2">Aposta: {formatPoints(slip.stake)} → Odd: {parseFloat(slip.combined_odds).toFixed(2)}x</span>
            <span className="font-bold">{formatPoints(slip.potential_win)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function Apostas() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState([]);
  const [tab, setTab] = useState('jogos');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadFixtures = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sports/fixtures');
      setFixtures(data.fixtures || []);
    } catch (err) {
      toast.error('Não foi possível carregar os jogos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFixtures();
    const interval = setInterval(loadFixtures, 30000);
    return () => clearInterval(interval);
  }, [loadFixtures]);

  const handleSelect = (fixture, market) => {
    const oddMap = { home: fixture.odds.home, draw: fixture.odds.draw, away: fixture.odds.away };
    const labelMap = { home: fixture.home, draw: 'Empate', away: fixture.away };
    setSelections(prev => {
      const withoutThisFixture = prev.filter(s => s.fixtureId !== fixture.id);
      const already = prev.find(s => s.fixtureId === fixture.id && s.market === market);
      if (already) return withoutThisFixture;
      return [...withoutThisFixture, {
        fixtureId: fixture.id, fixtureLabel: `${fixture.home} vs ${fixture.away}`,
        market, selectionLabel: labelMap[market], odds: oddMap[market],
      }];
    });
  };

  const findSelectionForFixture = (fixtureId) => selections.find(s => s.fixtureId === fixtureId);
  const removeSelection = (fixtureId) => setSelections(prev => prev.filter(s => s.fixtureId !== fixtureId));
  const clearSelections = () => setSelections([]);
  const onPlaced = () => { setSelections([]); setRefreshKey(k => k + 1); setTab('minhas'); };

  const liveFixtures     = fixtures.filter(f => f.status === 'live');
  const upcomingFixtures = fixtures.filter(f => f.status === 'scheduled');
  const finishedFixtures = fixtures.filter(f => f.status === 'finished');

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">🎲 Apostas</h1>
        <p className="text-text2 text-sm mt-1">Aposta em jogos — simples ou múltiplas</p>
      </div>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab('jogos')}
          className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all ${tab === 'jogos' ? 'bg-orange text-black' : 'bg-bg3 text-text2 border border-border'}`}>
          Jogos
        </button>
        <button onClick={() => setTab('minhas')}
          className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all ${tab === 'minhas' ? 'bg-orange text-black' : 'bg-bg3 text-text2 border border-border'}`}>
          Minhas Apostas
        </button>
      </div>

      {tab === 'minhas' ? (
        <div className="max-w-2xl"><MyBets refreshKey={refreshKey} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {loading ? (
              <div className="flex justify-center py-12"><Spinner size={28} /></div>
            ) : !fixtures.length ? (
              <Card className="text-center py-12">
                <p className="text-text3 text-sm">Nenhum jogo disponível agora.</p>
                <p className="text-text3 text-xs mt-1">O administrador ainda não criou jogos para apostar.</p>
              </Card>
            ) : (
              <>
                {liveFixtures.map(f => (
                  <FixtureCard key={f.id} fixture={f} selection={findSelectionForFixture(f.id)} onSelect={handleSelect} />
                ))}
                {upcomingFixtures.map(f => (
                  <FixtureCard key={f.id} fixture={f} selection={findSelectionForFixture(f.id)} onSelect={handleSelect} />
                ))}
                {finishedFixtures.map(f => (
                  <div key={f.id} className="opacity-60">
                    <FixtureCard fixture={f} selection={null} onSelect={() => {}} />
                  </div>
                ))}
              </>
            )}
          </div>
          <div>
            <BetSlip selections={selections} onRemove={removeSelection} onClear={clearSelections} onPlaced={onPlaced} />
          </div>
        </div>
      )}
    </div>
  );
}

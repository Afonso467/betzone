import { useGame } from '../context/GameContext';
import { Card, StatCard, ProgressBar, Badge } from '../components/ui';
import { formatPoints, formatNumber } from '../utils/constants';
import { useApi } from '../hooks/useApi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const XP_DATA = [
  { day: 'Seg', xp: 200 }, { day: 'Ter', xp: 450 }, { day: 'Qua', xp: 300 },
  { day: 'Qui', xp: 700 }, { day: 'Sex', xp: 550 }, { day: 'Sáb', xp: 900 }, { day: 'Dom', xp: 650 },
];

const QUICK_GAMES = [
  { emoji: '💣', label: 'Mines',        path: '/mines' },
  { emoji: '🪙', label: 'Coinflip',     path: '/coinflip' },
  { emoji: '📈', label: 'Crash',        path: '/crash' },
  { emoji: '🃏', label: 'Blackjack',    path: '/blackjack' },
  { emoji: '📦', label: 'Cases',        path: '/cases' },
  { emoji: '🎲', label: 'Apostas',      path: '/apostas' },
];

export default function Dashboard() {
  const { user }    = useGame();
  const navigate    = useNavigate();
  const { data: stateData } = useApi('/games/state');
  const history = stateData?.history || [];

  if (!user) return null;
  const xpPct = Math.round((user.xp / (user.xp_next || 5000)) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard 🏠</h1>
        <p className="text-text2 text-sm mt-1">Bem-vindo de volta, {user.username}!</p>
      </div>

      {/* User hero card */}
      <Card className="border-border2" style={{ background: 'linear-gradient(135deg, var(--bg3), var(--bg4))' }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange to-orange2 flex items-center justify-center text-3xl border-2 border-border2 flex-shrink-0">
            {user.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-extrabold">{user.username}</div>
            <div className="text-text2 text-sm mb-2">Nível {user.level} · {formatNumber(user.xp)} / {formatNumber(user.xp_next || 5000)} XP</div>
            <ProgressBar value={user.xp} max={user.xp_next || 5000} className="max-w-xs" />
          </div>
          <div className="flex gap-6 flex-wrap">
            {[
              { label: 'Pontos',   value: formatNumber(user.points), color: 'var(--orange)' },
              { label: 'Vitórias', value: user.wins,                 color: 'var(--green)'  },
              { label: 'Nível',    value: user.level,                color: 'var(--blue)'   },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-text2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="⚡" label="Total XP"  value={formatNumber(user.xp)}      change="+340 esta semana" changeUp />
        <StatCard icon="🏅" label="Nível"     value={user.level}                 change={`${xpPct}% para Lv.${user.level+1}`} changeUp />
        <StatCard icon="💎" label="Pontos"    value={formatNumber(user.points)}  change="+120 hoje" changeUp />
        <StatCard icon="🏆" label="Vitórias"  value={user.wins}                  change={`${user.wins}/${(user.wins||0)+(user.losses||0)} jogos`} changeUp />
      </div>

      {/* Chart + History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-bold mb-4">📈 Evolução de XP (7 dias)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={XP_DATA}>
              <defs>
                <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #27272a', borderRadius: 8, color: '#fafafa', fontSize: 12 }} />
              <Area type="monotone" dataKey="xp" stroke="#F59E0B" strokeWidth={2} fill="url(#xpGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-bold mb-3">🕹️ Últimos Jogos</h3>
          {history.length === 0 ? (
            <p className="text-text3 text-sm text-center py-8">Ainda sem jogos</p>
          ) : (
            history.slice(0, 6).map((g, i) => (
              <div key={g.id || i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className="text-xl">{g.game_type === 'mines' ? '💣' : g.game_type === 'coinflip' ? '🪙' : g.game_type === 'crash' ? '📈' : g.game_type === 'case_opening' ? '📦' : '🃏'}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold capitalize">{g.game_type?.replace('_', ' ')}</div>
                  <div className="text-xs text-text2">{new Date(g.created_at).toLocaleDateString('pt-PT')}</div>
                </div>
                <Badge color={g.result === 'win' ? 'green' : 'red'}>
                  {g.result === 'win' ? `+${formatPoints(g.win_amount)}` : `-${formatPoints(g.bet_amount)}`}
                </Badge>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Quick games */}
      <Card>
        <h3 className="font-bold mb-1">⚡ Jogos Rápidos</h3>
        <p className="text-text2 text-sm mb-4">Clica para jogar agora</p>
        <div className="flex gap-2 flex-wrap">
          {QUICK_GAMES.map(g => (
            <motion.button key={g.path} whileTap={{ scale: 0.95 }} onClick={() => navigate(g.path)}
              className="flex items-center gap-2 px-4 py-2.5 bg-bg4 border border-border rounded-[10px]
                text-sm font-semibold hover:border-orange hover:text-orange transition-colors">
              {g.emoji} {g.label}
            </motion.button>
          ))}
        </div>
      </Card>
    </div>
  );
}

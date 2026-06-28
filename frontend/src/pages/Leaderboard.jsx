import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Spinner } from '../components/ui';
import { formatNumber } from '../utils/constants';

function RankBadge({ rank }) {
  if (rank === 1) return <span className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-sm flex-shrink-0">🥇</span>;
  if (rank === 2) return <span className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-sm flex-shrink-0">🥈</span>;
  if (rank === 3) return <span className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center text-sm flex-shrink-0">🥉</span>;
  return (
    <span className="w-8 h-8 rounded-full bg-bg4 border border-border2 flex items-center justify-center text-xs font-bold text-text2 flex-shrink-0">
      {rank}
    </span>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { data, loading } = useApi('/leaderboard');
  // Mostra SEMPRE os jogadores reais devolvidos pela API — sem fallback
  // para dados fictícios, mesmo que a lista esteja vazia ou tenha só 1.
  const players = data?.players || [];
  const userRank = data?.userRank;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">🏆 Classificação</h1>
        <p className="text-text2 text-sm mt-1">Os melhores jogadores da plataforma</p>
      </div>

      {/* User position */}
      {userRank && (
        <Card className="mb-4 border-orange/30 bg-orange/5">
          <p className="text-sm font-semibold">
            🎯 A tua posição: <span className="text-orange font-black">#{userRank}</span>
          </p>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : players.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-text2 text-sm">Ainda não há jogadores na classificação.</p>
          <p className="text-text3 text-xs mt-1">Joga e ganha XP para apareceres aqui!</p>
        </Card>
      ) : (
        <>
          {/* Top 3 podium — só aparece com 3+ jogadores reais (evita coluna vazia) */}
          {players.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[players[1], players[0], players[2]].map((p, i) => {
                const heights = ['h-28', 'h-36', 'h-24'];
                return (
                  <motion.div key={`podium-${p.username}-${i}`}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className={`text-center flex flex-col items-center justify-end gap-1 px-2 py-3 ${heights[i]} ${i === 1 ? 'border-orange/40' : ''}`}>
                      <div className="text-xl">{['🥈','🥇','🥉'][i]}</div>
                      <div className="text-2xl">{p.avatar}</div>
                      <div className="text-xs font-bold truncate max-w-full px-1">{p.username}</div>
                      <div className="text-[10px] text-orange font-semibold">{formatNumber(p.xp)} XP</div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          <Card className="p-0 overflow-hidden">
            {players.map((p, i) => {
              const isMe = p.username === user?.username;
              return (
                <motion.div key={`list-${p.username}-${i}`}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 transition-colors
                    ${isMe ? 'bg-orange/5' : 'hover:bg-bg4'}`}
                >
                  <RankBadge rank={p.rank || i + 1} />
                  <div className="w-9 h-9 rounded-full bg-bg4 border border-border2 flex items-center justify-center text-lg flex-shrink-0">
                    {p.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      {p.username}
                      {isMe && <Badge color="orange" className="text-[9px]">TU</Badge>}
                    </div>
                    <div className="text-xs text-text2">Lv.{p.level} · {formatNumber(p.xp)} XP</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-orange">{formatNumber(p.points)}</div>
                    <div className="text-xs text-text2">🏆 {formatNumber(p.wins)}</div>
                  </div>
                </motion.div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}

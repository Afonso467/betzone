import { motion } from 'framer-motion';
import { useApi } from '../hooks/useApi';
import { useGame } from '../context/AuthContext';
import { Card, Badge, Spinner } from '../components/ui';
import { formatNumber } from '../utils/constants';

const DEMO = [
  { rank:1, username:'ShadowKing', avatar:'👑', level:32, xp:98400,  wins:892, points:124500 },
  { rank:2, username:'NightWolf',  avatar:'🐺', level:30, xp:87200,  wins:741, points:108900 },
  { rank:3, username:'CrystalAce', avatar:'💎', level:27, xp:72100,  wins:628, points:94300  },
  { rank:4, username:'GamerPro',   avatar:'🎮', level:12, xp:63450,  wins:547, points:78200  },
  { rank:5, username:'BladeRunner',avatar:'⚔️', level:24, xp:58900,  wins:498, points:71500  },
  { rank:6, username:'PhoenixFire',avatar:'🔥', level:21, xp:52300,  wins:445, points:65100  },
  { rank:7, username:'IronGhost',  avatar:'👻', level:19, xp:47800,  wins:412, points:59400  },
  { rank:8, username:'VoidWalker', avatar:'🌀', level:17, xp:43200,  wins:378, points:53800  },
];

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
  const { user } = useGame();
  const { data, loading } = useApi('/leaderboard');
  const players = data?.players?.length ? data.players : DEMO;
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

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[players[1], players[0], players[2]].map((p, i) => {
          if (!p) return <div key={`podium-empty-${i}`} />;
          const heights = ['h-24', 'h-32', 'h-20'];
          return (
            <motion.div key={`podium-${p.username}-${i}`}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`text-center flex flex-col justify-end ${heights[i]} ${i === 1 ? 'border-orange/40' : ''}`}>
                <div className="text-2xl mb-1">{p.avatar}</div>
                <div className="text-xs font-bold truncate">{p.username}</div>
                <div className="text-[10px] text-orange font-semibold">{formatNumber(p.xp)} XP</div>
                <div className="text-lg mt-0.5">{['🥈','🥇','🥉'][i]}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Full list */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-8"><Spinner /></div>
        ) : (
          players.map((p, i) => {
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
                  <div className="text-xs text-text2">Lv.{p.level || Math.floor((p.xp || 0)/5000)+1} · {formatNumber(p.xp)} XP</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-orange">{formatNumber(p.points)}</div>
                  <div className="text-xs text-text2">🏆 {formatNumber(p.wins)}</div>
                </div>
              </motion.div>
            );
          })
        )}
      </Card>
    </div>
  );
}

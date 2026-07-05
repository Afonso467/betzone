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

// 🛠️ Componente reutilizável para renderizar com segurança o Avatar (Emoji ou URL da Web)
function SafeAvatar({ avatar, username }) {
  const isUrlAvatar = typeof avatar === 'string' && (avatar.startsWith('http://') || avatar.startsWith('https://'));

  return (
    <div className="w-9 h-9 rounded-full bg-bg4 border border-border2 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
      {isUrlAvatar ? (
        <img 
          src={avatar} 
          alt={username} 
          className="w-full h-full object-cover"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        avatar
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { data, loading } = useApi('/leaderboard');
  
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
                  
                  {/* 🛠️ Usando o Avatar seguro aqui também */}
                  <SafeAvatar avatar={p.avatar} username={p.username} />

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span className="truncate">{p.username}</span>
                      {isMe && <Badge color="orange" className="text-[9px] flex-shrink-0">TU</Badge>}
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
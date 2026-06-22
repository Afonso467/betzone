import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { ProgressBar } from '../ui';
import { formatNumber } from '../../utils/constants';

export default function Navbar() {
  const { user, refresh } = useGame();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  if (!user) return null;
  const xpPct = Math.round((user.xp / (user.xp_next || 5000)) * 100);

  return (
    <header className="h-16 bg-bg2 border-b border-border flex items-center px-5 gap-3 flex-shrink-0 z-40">
      <div className="flex-1" />

      {/* Pontos — única moeda da plataforma */}
      <div className="flex items-center gap-1.5 bg-bg3 border border-border rounded-[10px] px-3 py-1.5 text-sm font-semibold">
        <span className="text-orange text-base">💎</span>
        {formatNumber(user.points)} pts
      </div>

      {/* Refresh */}
      <button onClick={handleRefresh}
        className="w-9 h-9 bg-bg3 border border-border rounded-[10px] flex items-center justify-center text-text2 hover:text-orange hover:border-orange transition-colors">
        <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.6 }}>
          <RefreshCw size={15} />
        </motion.div>
      </button>

      {/* Notifications */}
      <button className="w-9 h-9 bg-bg3 border border-border rounded-[10px] flex items-center justify-center text-text2 hover:text-white transition-colors relative">
        <Bell size={16} />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white border-2 border-bg2">3</span>
      </button>

      {/* User */}
      <button onClick={() => navigate('/profile')}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-[10px] hover:bg-bg3 transition-colors">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange to-orange2 flex items-center justify-center text-lg border-2 border-border2 flex-shrink-0">
          {user.avatar}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-sm font-semibold leading-tight">{user.username}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <ProgressBar value={user.xp} max={user.xp_next || 5000} className="w-16" />
            <span className="text-[10px] text-text3">Lv.{user.level}</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center bg-orange/10 border border-orange/20 text-orange text-xs font-bold px-2 py-0.5 rounded-full">
          {user.level}
        </div>
      </button>
    </header>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, RefreshCw, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { ProgressBar } from '../ui';
import { formatNumber } from '../../utils/constants';

export default function Navbar() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;
  const xpPct = Math.round((user.xp / (user.xp_next || 5000)) * 100);

  // 🛠️ Função auxiliar para detetar se o avatar é um link da Web
  const isUrlAvatar = typeof user.avatar === 'string' && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://'));

  return (
    <header className="h-16 bg-bg2 border-b border-border flex items-center px-5 gap-3 flex-shrink-0 z-40">
      <div className="flex-1" />

      {/* Pontos — única moeda da plataforma */}
      <div className="flex items-center gap-1.5 bg-bg3 border border-border rounded-[10px] px-3 py-1.5 text-sm font-semibold">
        <span className="text-orange text-base">💎</span>
        {formatNumber(user.points)} pts
      </div>

      {/* User */}
      <button onClick={() => navigate('/profile')}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-[10px] hover:bg-bg3 transition-colors">
        
        {/* 🛠️ Contentor do Avatar Atualizado e Protegido */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange to-orange2 flex items-center justify-center text-lg border-2 border-border2 flex-shrink-0 overflow-hidden">
          {isUrlAvatar ? (
            <img 
              src={user.avatar} 
              alt={user.username} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback caso a imagem externa dê erro de carregamento (ex: link partido)
                e.target.style.display = 'none';
              }}
            />
          ) : (
            user.avatar
          )}
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

      {/* Logout */}
      <button onClick={handleLogout} title="Sair"
        className="w-9 h-9 bg-bg3 border border-border rounded-[10px] flex items-center justify-center text-text2 hover:text-red hover:border-red transition-colors">
        <LogOut size={15} />
      </button>
    </header>
  );
}
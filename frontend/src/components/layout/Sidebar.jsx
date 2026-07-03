import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, User, Gift,
  Trophy, Gamepad2, Dices, Package, CircleDollarSign,
  Bomb, TrendingUp, Club, Disc3, Layers, Joystick,
  ChevronLeft, ChevronRight, ShieldCheck, Briefcase
} from 'lucide-react';

const MAIN_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/' },
  { icon: User,            label: 'Meu Perfil',   path: '/profile' },
  { icon: Briefcase,       label: 'Inventário',   path: '/inventory' }, // Adicionado aqui
  { icon: Gift,            label: 'Giveaways',    path: '/giveaways' },
  { icon: Trophy,          label: 'Classificação',path: '/leaderboard' },
];

const GAME_ITEMS = [
  { icon: Gamepad2,          label: 'Minigames',    path: '/minigames' },
  { icon: Dices,             label: 'Apostas',      path: '/apostas' },
  { icon: Package,           label: 'Case Opening', path: '/cases' },
  { icon: Disc3,             label: 'Roleta',       path: '/roulette' },
  { icon: CircleDollarSign,  label: 'Coinflip',     path: '/coinflip' },
  { icon: Bomb,              label: 'Mines',        path: '/mines' },
  { icon: TrendingUp,        label: 'Crash',        path: '/crash' },
  { icon: Club,              label: 'Blackjack',    path: '/blackjack' },
  { icon: Dices,             label: 'Dice',         path: '/dice' },
  { icon: Layers,            label: 'Plinko',       path: '/plinko' },
  { icon: Club,              label: 'Vídeo Poker',  path: '/poker' },
  { icon: Joystick,          label: 'Slots',        path: '/slots' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const navigate  = useNavigate();
  const location  = useLocation();

  const NavItem = ({ icon: Icon, label, path, href }) => {
    const active = path && location.pathname === path;
    const handleClick = () => {
      if (href) window.open(href, '_blank');
      else navigate(path);
    };
    return (
      <motion.div
        onClick={handleClick}
        className={`
          relative flex items-center gap-2.5 px-3 py-2.5 mx-2 rounded-[10px] cursor-pointer
          text-sm font-medium transition-colors select-none
          ${active
            ? 'bg-orange/10 text-orange'
            : 'text-text2 hover:text-white hover:bg-bg3'}
        `}
        whileTap={{ scale: 0.97 }}
        title={collapsed ? label : undefined}
      >
        {active && (
          <motion.div
            layoutId="active-pill"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/5 bg-orange rounded-r"
          />
        )}
        <Icon size={17} className="flex-shrink-0" />
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="truncate"
          >
            {label}
          </motion.span>
        )}
      </motion.div>
    );
  };

  const SectionLabel = ({ children }) =>
    !collapsed ? (
      <p className="px-5 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-text3">
        {children}
      </p>
    ) : <div className="my-2 border-t border-border mx-3" />;

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen bg-bg2 border-r border-border flex-shrink-0 overflow-hidden z-50"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 min-h-[64px] border-b border-border flex-shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-orange to-orange2 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
          🎮
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-base font-black tracking-tight"
          >
            Nova<span className="text-orange">Crates</span>
          </motion.span>
        )}
      </div>

      <button
        onClick={onToggle}
        className="absolute top-[18px] right-2 w-6 h-6 bg-bg3 border border-border2 rounded-full
          flex items-center justify-center text-text2 hover:text-orange hover:border-orange
          transition-colors z-50 shadow-card"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {MAIN_ITEMS.map(item => <NavItem key={item.path} {...item} />)}

        <SectionLabel>Minigames</SectionLabel>
        {GAME_ITEMS.map(item => <NavItem key={item.path} {...item} />)}

        <div className="mt-3 pt-3 border-t border-border">
          <NavItem icon={ShieldCheck} label="Admin" path="/admin" />
        </div>
      </nav>
    </motion.aside>
  );
}
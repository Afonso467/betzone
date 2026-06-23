import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useGame } from '../context/GameContext';
import { Card, Badge, Button } from '../components/ui';
import { formatPoints, RARITY_COLORS, RARITY_BG } from '../utils/constants';
import api from '../utils/api';

const RARITIES = ['Todos', 'Consumer', 'Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert', 'Special'];

const DEMO_SKINS = [
  { id:1, name:'AK-47 | Redline',          wear:'Field-Tested',   points_value:1200,  emoji:'🔫', rarity:'Classified', color:'#b44dff' },
  { id:2, name:'AWP | Asiimov',            wear:'Battle-Scarred', points_value:890,   emoji:'🎯', rarity:'Covert',     color:'#ff4d4d' },
  { id:3, name:'Glock | Fade',             wear:'Factory New',    points_value:3400,  emoji:'🔫', rarity:'Restricted', color:'#4d79ff' },
  { id:4, name:'Butterfly Knife | Doppler',wear:'Minimal Wear',   points_value:12000, emoji:'🔪', rarity:'Special',    color:'#ffd700' },
  { id:5, name:'M4A1-S | HyperBeast',      wear:'Field-Tested',   points_value:670,   emoji:'⚙️', rarity:'Covert',     color:'#ff4d4d' },
  { id:6, name:'Desert Eagle | Blaze',     wear:'Factory New',    points_value:4300,  emoji:'🔫', rarity:'Restricted', color:'#4d79ff' },
  { id:7, name:'USP-S | Kill Confirmed',   wear:'Minimal Wear',   points_value:980,   emoji:'🔫', rarity:'Covert',     color:'#ff4d4d' },
  { id:8, name:'P250 | Sand Dune',         wear:'Battle-Scarred', points_value:12,    emoji:'🔫', rarity:'Consumer',   color:'#9ca3af' },
  { id:9, name:'Nova | Tempest',           wear:'Field-Tested',   points_value:35,    emoji:'🔧', rarity:'Industrial', color:'#6baed6' },
  { id:10,name:'Tec-9 | Brass',           wear:'Battle-Scarred', points_value:120,   emoji:'⚔️', rarity:'Mil-Spec',   color:'#4d79ff' },
];

export default function SkinMarket() {
  const { refresh } = useGame();
  const { data } = useApi('/skins');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [buying, setBuying] = useState({});

  const skins = (data?.skins?.length ? data.skins : DEMO_SKINS)
    .filter(s => filter === 'Todos' || s.rarity === filter)
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  const buy = async (skin) => {
    setBuying(b => ({ ...b, [skin.id]: true }));
    try {
      await api.post(`/skins/${skin.id}/buy`);
      toast.success(`🛒 Compraste: ${skin.name}`);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao comprar');
    } finally {
      setBuying(b => ({ ...b, [skin.id]: false }));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">🛒 Skin Market</h1>
        <p className="text-text2 text-sm mt-1">Compra e vende skins do teu inventário</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
          <input
            placeholder="Pesquisar skins..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg3 border border-border2 text-white rounded-[10px] pl-8 pr-3 py-2.5 text-sm
              focus:outline-none focus:border-orange placeholder:text-text3"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {RARITIES.map(r => (
            <button key={r} onClick={() => setFilter(r)}
              className={`px-3 py-2 rounded-[10px] text-xs font-semibold border transition-all
                ${filter === r ? 'bg-orange text-black border-orange' : 'bg-bg4 text-text2 border-border2 hover:border-border'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {skins.map((skin, i) => (
          <motion.div key={skin.id}
            initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
            className="bg-bg3 border border-border rounded-card overflow-hidden cursor-pointer group
              hover:border-orange hover:-translate-y-1 transition-all"
          >
            <div className="h-24 flex items-center justify-center text-5xl"
              style={{ background: `${RARITY_BG[skin.rarity] || '#374151'}88`, borderBottom: `1px solid ${skin.color || '#9ca3af'}30` }}>
              {skin.emoji}
            </div>
            <div className="p-3">
              <div className="text-xs font-bold truncate mb-0.5">{skin.name}</div>
              <div className="text-xs text-text2 mb-2">{skin.wear}</div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-orange text-sm">{formatPoints(skin.points_value)}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${skin.color}20`, color: skin.color }}>
                  {skin.rarity}
                </span>
              </div>
              <button onClick={() => buy(skin)} disabled={buying[skin.id]}
                className="w-full py-1.5 rounded-lg bg-orange text-black text-xs font-bold
                  hover:bg-orange2 transition-colors disabled:opacity-50">
                {buying[skin.id] ? '…' : 'Comprar'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {skins.length === 0 && (
        <div className="text-center py-20 text-text3">
          <div className="text-4xl mb-3">🔍</div>
          <p>Nenhuma skin encontrada</p>
        </div>
      )}
    </div>
  );
}

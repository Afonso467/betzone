import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const GAMES = [
  { path: '/mines',     icon: '💣', title: 'Mines',        desc: 'Evita as minas e multiplica o teu saldo. Quanto mais longe fores, maior o multiplicador!', color: '#10b981' },
  { path: '/cases',     icon: '📦', title: 'Case Opening',  desc: 'Abre caixas e descobre skins raras. Podes ganhar itens Covert e Special!',               color: '#8b5cf6' },
  { path: '/coinflip',  icon: '🪙', title: 'Coinflip',      desc: 'Cara ou Coroa? Uma moeda decide o teu destino. Simples e viciante.',                      color: '#F59E0B' },
  { path: '/apostas',   icon: '🎲', title: 'Apostas',       desc: 'Aposta em eventos de esports. Analisa as odds e maximiza os teus ganhos.',                 color: '#3b82f6' },
  { path: '/crash',     icon: '📈', title: 'Crash',         desc: 'O multiplicador sobe continuamente. Retira antes do crash ou perde tudo!',                 color: '#ef4444' },
  { path: '/blackjack', icon: '🃏', title: 'Blackjack',     desc: 'O clássico jogo de cartas contra o dealer. Chega aos 21 sem ultrapassar!',                 color: '#f97316' },
];

export default function Minigames() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">💣 Minigames</h1>
        <p className="text-text2 text-sm mt-1">Escolhe o teu jogo favorito e começa a jogar</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GAMES.map((g, i) => (
          <motion.div key={g.path}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => navigate(g.path)}
            className="bg-bg3 border border-border rounded-card2 overflow-hidden cursor-pointer group transition-all hover:border-orange hover:-translate-y-1"
            style={{ boxShadow: '0 0 0 0 transparent', transition: 'all .2s' }}
            whileHover={{ boxShadow: '0 0 24px rgba(245,158,11,.12)' }}
          >
            <div className="h-28 flex items-center justify-center text-6xl"
              style={{ background: `linear-gradient(135deg, ${g.color}20, ${g.color}08)` }}>
              {g.icon}
            </div>
            <div className="p-5">
              <div className="font-bold text-base mb-1.5">{g.title}</div>
              <p className="text-text2 text-xs leading-relaxed mb-4">{g.desc}</p>
              <button className="w-full py-2 rounded-[10px] bg-orange text-black text-sm font-bold
                hover:bg-orange2 transition-colors">
                ▶ Jogar Agora
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

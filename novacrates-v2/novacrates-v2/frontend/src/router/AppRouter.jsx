import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';

// Pages
import Dashboard   from '../pages/Dashboard';
import Profile     from '../pages/Profile';
import Minigames   from '../pages/Minigames';
import Apostas     from '../pages/Apostas';
import Giveaways   from '../pages/Giveaways';
import SkinMarket  from '../pages/SkinMarket';
import Loja        from '../pages/Loja';
import Leaderboard from '../pages/Leaderboard';
import Admin       from '../pages/Admin';
import { MinesPage, CoinflipPage, CrashPage, BlackjackPage, CasesPage } from '../pages/GamePages';
import { Parcerias, Sobre } from '../pages/StaticPages';

// Sem autenticação — todas as rotas estão diretamente acessíveis dentro do Layout
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index            element={<Dashboard />} />
        <Route path="profile"   element={<Profile />} />
        <Route path="minigames" element={<Minigames />} />
        <Route path="mines"     element={<MinesPage />} />
        <Route path="coinflip"  element={<CoinflipPage />} />
        <Route path="crash"     element={<CrashPage />} />
        <Route path="blackjack" element={<BlackjackPage />} />
        <Route path="cases"     element={<CasesPage />} />
        <Route path="apostas"   element={<Apostas />} />
        <Route path="giveaways" element={<Giveaways />} />
        <Route path="market"    element={<SkinMarket />} />
        <Route path="loja"      element={<Loja />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="parcerias" element={<Parcerias />} />
        <Route path="sobre"     element={<Sobre />} />
        <Route path="admin"     element={<Admin />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

// Auth pages
import Login    from '../pages/Login';
import Register from '../pages/Register';

// Pages
import Dashboard   from '../pages/Dashboard';
import Profile     from '../pages/Profile';
import Inventory   from '../pages/Inventory';
import Minigames   from '../pages/Minigames';
import Apostas     from '../pages/Apostas';
import Giveaways   from '../pages/Giveaways';
import SkinMarket  from '../pages/SkinMarket';
import Loja        from '../pages/Loja';
import Leaderboard from '../pages/Leaderboard';
import Admin       from '../pages/Admin';
import { MinesPage, CoinflipPage, CrashPage, BlackjackPage, CasesPage, RoulettePage, DicePage, PlinkoPage, VideoPokerPage, SlotsPage } from '../pages/GamePages';
import { Parcerias, Sobre } from '../pages/StaticPages';

// Bloqueia o acesso a rotas privadas se não houver sessão ativa
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

// Impede ver login/registo se já tiver sessão ativa
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function AppRouter() {
  return (
    <Routes>
        <Route path="/login"    element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index            element={<Dashboard />} />
          <Route path="profile"   element={<Profile />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="minigames" element={<Minigames />} />
          <Route path="mines"     element={<MinesPage />} />
          <Route path="coinflip"  element={<CoinflipPage />} />
          <Route path="crash"     element={<CrashPage />} />
          <Route path="blackjack" element={<BlackjackPage />} />
          <Route path="cases"     element={<CasesPage />} />
          <Route path="roulette"    element={<RoulettePage />} />
          <Route path="dice"        element={<DicePage />} />
          <Route path="plinko"      element={<PlinkoPage />} />
          <Route path="poker"       element={<VideoPokerPage />} />
          <Route path="slots"       element={<SlotsPage />} />
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
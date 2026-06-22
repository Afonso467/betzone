import { MinesGame, CoinflipGame, CrashGame, BlackjackGame, CaseOpeningGame } from '../components/games';

function GamePage({ title, icon, children }) {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">{icon} {title}</h1>
      </div>
      {children}
    </div>
  );
}

export function MinesPage()     { return <GamePage title="Mines"        icon="💣"><MinesGame /></GamePage>; }
export function CoinflipPage()  { return <GamePage title="Coinflip"     icon="🪙"><CoinflipGame /></GamePage>; }
export function CrashPage()     { return <GamePage title="Crash"        icon="📈"><CrashGame /></GamePage>; }
export function BlackjackPage() { return <GamePage title="Blackjack"    icon="🃏"><BlackjackGame /></GamePage>; }
export function CasesPage()     { return <GamePage title="Case Opening" icon="📦"><CaseOpeningGame /></GamePage>; }

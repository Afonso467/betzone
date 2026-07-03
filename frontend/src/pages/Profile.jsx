import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Badge, ProgressBar, StatCard } from '../components/ui';
import { formatPoints, formatNumber } from '../utils/constants';
import { useApi } from '../hooks/useApi';
import api from '../utils/api';

const AVATARS = ['🎮','🔥','💎','👑','⚔️','🐺','🦅','🌀','🎯','🏆','💥','🌟'];

export default function Profile() {
  const { user, refresh } = useAuth();
  const { data: invData }   = useApi('/store/inventory');
  const { data: stateData } = useApi('/games/state');

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const history   = stateData?.history || [];
  const inventory = invData?.inventory || [];

  const setAvatar = async (av) => {
    try {
      await api.put('/users/profile', { avatar: av }).catch(() => {});
      await refresh();
      toast.success('Avatar atualizado!');
    } catch (_) {
      toast.error('Não foi possível atualizar o avatar');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      toast.error('As passwords não coincidem');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password alterada com sucesso!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao alterar password');
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return null;
  const xpPct = Math.round((user.xp / (user.xp_next || 5000)) * 100);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">👤 Meu Perfil</h1>
        <p className="text-text2 text-sm mt-1">As tuas estatísticas e progresso</p>
      </div>

      {/* Profile hero */}
      <Card className="overflow-hidden p-0">
        <div className="h-28" style={{ background: 'linear-gradient(135deg, #1c1c1f, #27272a, #3f3f46)' }} />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4 flex-wrap">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange to-orange2 flex items-center justify-center text-4xl flex-shrink-0" style={{ border: '3px solid var(--bg2)' }}>
              {user.avatar}
            </div>
            <div className="pb-2 flex-1">
              <div className="text-xl font-extrabold">{user.username}</div>
              <div className="text-text2 text-sm">{user.email}</div>
            </div>
            <div className="pb-2">
              <span className="text-xs font-bold bg-orange/10 text-orange border border-orange/20 px-3 py-1 rounded-full">
                Nível {user.level}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs text-text2">XP: {formatNumber(user.xp)} / {formatNumber(user.xp_next || 5000)}</span>
            <span className="text-xs text-orange">({xpPct}%)</span>
          </div>
          <ProgressBar value={user.xp} max={user.xp_next || 5000} className="max-w-xs" />
        </div>
      </Card>

      {/* Avatars */}
      <Card>
        <h3 className="font-bold mb-3 text-sm">🎭 Escolher Avatar</h3>
        <div className="flex gap-2 flex-wrap">
          {AVATARS.map(av => (
            <button key={av} onClick={() => setAvatar(av)}
              className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all
                ${user.avatar === av ? 'bg-orange/10 border-2 border-orange scale-110' : 'bg-bg4 border-2 border-border hover:border-border2'}`}>
              {av}
            </button>
          ))}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon="⚡" label="XP Total"     value={formatNumber(user.xp)} />
        <StatCard icon="🏆" label="Vitórias"     value={user.wins} />
        <StatCard icon="❌" label="Derrotas"     value={user.losses} />
        <StatCard icon="💎" label="Pontos"       value={formatNumber(user.points)} />
        <StatCard icon="🏅" label="Nível"        value={user.level} />
        <StatCard icon="📊" label="Taxa Vitória" value={user.wins + user.losses > 0 ? Math.round(user.wins / (user.wins + user.losses) * 100) + '%' : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* History */}
        <Card>
          <h3 className="font-bold mb-3">📋 Histórico</h3>
          {history.length === 0
            ? <p className="text-text3 text-sm text-center py-6">Ainda sem jogos</p>
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-text3 text-xs border-b border-border">
                    <th className="text-left py-2 font-medium">Jogo</th>
                    <th className="text-left py-2 font-medium">Resultado</th>
                    <th className="text-right py-2 font-medium">Valor</th>
                  </tr></thead>
                  <tbody>
                    {history.slice(0, 8).map((g, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2 capitalize">{g.game_type?.replace('_', ' ')}</td>
                        <td className="py-2"><Badge color={g.result === 'win' ? 'green' : 'red'}>{g.result}</Badge></td>
                        <td className="py-2 text-right font-semibold" style={{ color: g.result === 'win' ? 'var(--green)' : 'var(--red)' }}>
                          {g.result === 'win' ? `+${formatPoints(g.win_amount)}` : `-${formatPoints(g.bet_amount)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </Card>

        {/* Inventory */}
        <Card>
          <h3 className="font-bold mb-3">🎒 Inventário</h3>
          {inventory.length === 0
            ? <p className="text-text3 text-sm text-center py-6">Inventário vazio</p>
            : <div className="grid grid-cols-2 gap-2">
                {inventory.slice(0, 6).map((item, i) => {
                  const sellValue = Math.round((item.points_value || 0) * 0.85);
                  return (
                    <div key={i} className="bg-bg4 border border-border rounded-[10px] p-2 text-center">
                      <div className="text-2xl mb-1">{item.emoji || '🔫'}</div>
                      <div className="text-xs font-semibold truncate">{item.name}</div>
                      <div className="text-xs text-text2">{item.wear}</div>
                      <div className="text-xs text-blue font-semibold mt-0.5 mb-2">{formatNumber(item.points_value)} pts</div>
                      <button
                        onClick={async () => {
                          try {
                            await api.post('/skins/sell', { inventoryId: item.inventory_id });
                            toast.success(`Vendido por ${formatNumber(sellValue)} pts!`);
                            refresh();
                          } catch (err) {
                            toast.error(err.response?.data?.error || 'Erro ao vender');
                          }
                        }}
                        className="w-full py-1 rounded-lg text-[10px] font-bold bg-danger/10 text-red border border-red/20 hover:bg-red hover:text-white transition-all">
                        Vender — {formatNumber(sellValue)} pts
                      </button>
                    </div>
                  );
                })}
              </div>
          }
        </Card>
      </div>

      {/* Change password */}
      <Card className="max-w-md">
        <h3 className="font-bold mb-4">🔒 Alterar Password</h3>
        <form onSubmit={changePassword}>
          <Input label="Password Atual" type="password" value={pwForm.currentPassword}
            onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
          <Input label="Nova Password" type="password" value={pwForm.newPassword} minLength={6}
            onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required />
          <Input label="Confirmar Nova Password" type="password" value={pwForm.confirm} minLength={6}
            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
          <Button type="submit" loading={pwLoading}>Alterar Password</Button>
        </form>
      </Card>
    </div>
  );
}
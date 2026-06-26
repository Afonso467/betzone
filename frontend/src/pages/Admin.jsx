import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Trash2, Check, Play } from 'lucide-react';
import { Card, Button, Input, Badge, Spinner } from '../components/ui';
import api from '../utils/api';

// ── Login do admin ────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      sessionStorage.setItem('nc_admin_password', password);
      await api.get('/admin/fixtures');
      toast.success('Acesso de administrador concedido');
      onLogin();
    } catch (err) {
      sessionStorage.removeItem('nc_admin_password');
      toast.error(err.response?.data?.error || 'Password incorreta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <h2 className="font-bold text-lg mb-1 text-center">🔐 Painel de Administração</h2>
        <p className="text-text2 text-xs text-center mb-5">Acesso restrito — gestão de jogos e resultados</p>
        <form onSubmit={submit}>
          <Input label="Password de administrador" type="password" value={password}
            onChange={e => setPassword(e.target.value)} required autoFocus />
          <Button type="submit" loading={loading} className="w-full py-3 mt-1">Entrar</Button>
        </form>
      </Card>
    </div>
  );
}

// ── Formulário de criação de jogo ─────────────────────────────────────────────
function CreateFixtureForm({ onCreated }) {
  const [form, setForm] = useState({
    competition: '', roundLabel: '', homeTeam: '', awayTeam: '',
    homeLogo: '', awayLogo: '', kickoffAt: '', oddsHome: 2.0, oddsDraw: 3.2, oddsAway: 3.5,
  });
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/fixtures', form);
      toast.success('Jogo criado!');
      setForm(f => ({ ...f, homeTeam: '', awayTeam: '', homeLogo: '', awayLogo: '', kickoffAt: '' }));
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar jogo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h3 className="font-bold mb-4">➕ Criar Novo Jogo</h3>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Input label="Competição" placeholder="ex: FIFA World Cup 2026" value={form.competition} onChange={set('competition')} required />
          <Input label="Ronda / Jornada (opcional)" placeholder="ex: Grupo H, 2.ª jornada" value={form.roundLabel} onChange={set('roundLabel')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Input label="Equipa / Seleção da casa" placeholder="ex: Espanha" value={form.homeTeam} onChange={set('homeTeam')} required />
          <Input label="URL da bandeira/badge (casa)" placeholder="https://flagcdn.com/w160/es.png" value={form.homeLogo} onChange={set('homeLogo')} required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Input label="Equipa / Seleção visitante" placeholder="ex: Arábia Saudita" value={form.awayTeam} onChange={set('awayTeam')} required />
          <Input label="URL da bandeira/badge (fora)" placeholder="https://flagcdn.com/w160/sa.png" value={form.awayLogo} onChange={set('awayLogo')} required />
        </div>

        <Input label="Data e hora do jogo" type="datetime-local" value={form.kickoffAt} onChange={set('kickoffAt')} required />

        <div className="grid grid-cols-3 gap-3">
          <Input label="Odd Casa (1)" type="number" step="0.01" min="1" value={form.oddsHome} onChange={set('oddsHome')} required />
          <Input label="Odd Empate (X)" type="number" step="0.01" min="1" value={form.oddsDraw} onChange={set('oddsDraw')} required />
          <Input label="Odd Fora (2)" type="number" step="0.01" min="1" value={form.oddsAway} onChange={set('oddsAway')} required />
        </div>

        {(form.homeLogo || form.awayLogo) && (
          <div className="flex items-center justify-center gap-6 mb-4 p-3 bg-bg4 rounded-[10px]">
           {form.homeLogo && <img src={form.homeLogo} alt="" className="w-12 h-12 object-contain rounded-full" onError={e => e.target.style.opacity = 0.2} />}
          <span className="text-text3 text-xs font-bold">VS</span>
          {form.awayLogo && <img src={form.awayLogo} alt="" className="w-12 h-12 object-contain rounded-full" onError={e => e.target.style.opacity = 0.2} />}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full py-3">Criar Jogo</Button>
      </form>
    </Card>
  );
}

// ── Cartão de gestão de um jogo existente ─────────────────────────────────────
function FixtureManageCard({ fixture, onChanged }) {
  const [goalsHome, setGoalsHome] = useState(0);
  const [goalsAway, setGoalsAway] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);

  const setStatus = async (status) => {
    setLoading(true);
    try {
      await api.post(`/admin/fixtures/${fixture.id}/status`, { status });
      toast.success(`Estado atualizado: ${status}`);
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const submitResult = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/admin/fixtures/${fixture.id}/result`, { goalsHome: +goalsHome, goalsAway: +goalsAway });
      toast.success(data.message);
      setShowResult(false);
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao definir resultado');
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remover o jogo ${fixture.home} vs ${fixture.away}?`)) return;
    try {
      await api.delete(`/admin/fixtures/${fixture.id}`);
      toast.success('Jogo removido');
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao remover');
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <Badge color={fixture.status === 'live' ? 'red' : fixture.status === 'finished' ? 'gray' : 'blue'}>
            {fixture.status === 'live' ? '🔴 AO VIVO' : fixture.status === 'finished' ? '✅ Terminado' : '⏰ Agendado'}
          </Badge>
          <span className="text-xs text-text2 ml-2">{fixture.competition}</span>
        </div>
        <button onClick={remove} className="text-text3 hover:text-red transition-colors"><Trash2 size={14} /></button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 text-center">
          <img src={fixture.homeLogo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain rounded-full" crossOrigin="anonymous" referrerPolicy="no-referrer"/>
          <div className="text-xs font-bold truncate">{fixture.home}</div>
        </div>
        <div className="text-center px-2">
          {fixture.status === 'finished'
            ? <span className="font-black">{fixture.goalsHome} - {fixture.goalsAway}</span>
            : <span className="text-xs text-text3">{new Date(fixture.kickoffAt).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        <div className="flex-1 text-center">
          <img src={fixture.awayLogo} alt="" className="w-10 h-10 mx-auto mb-1 object-contain rounded-full" crossOrigin="anonymous" referrerPolicy="no-referrer"/>
          <div className="text-xs font-bold truncate">{fixture.away}</div>
        </div>
      </div>

      <div className="flex gap-2 text-xs text-center mb-3">
        <div className="flex-1 bg-bg4 rounded-lg py-1.5">1: <span className="text-orange font-bold">{fixture.odds.home}</span></div>
        <div className="flex-1 bg-bg4 rounded-lg py-1.5">X: <span className="text-orange font-bold">{fixture.odds.draw}</span></div>
        <div className="flex-1 bg-bg4 rounded-lg py-1.5">2: <span className="text-orange font-bold">{fixture.odds.away}</span></div>
      </div>

      {fixture.status !== 'finished' && (
        <div className="flex gap-2">
          {fixture.status !== 'live' && (
            <Button size="sm" variant="secondary" onClick={() => setStatus('live')} disabled={loading}>
              <Play size={12} className="mr-1" /> Marcar ao vivo
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={() => setStatus('cancelled')} disabled={loading}>
            Cancelar jogo
          </Button>
          <Button size="sm" onClick={() => setShowResult(v => !v)} disabled={loading}>
            🏁 Definir Resultado
          </Button>
        </div>
      )}

      {showResult && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 p-3 bg-bg4 rounded-[10px]">
          <div className="flex items-center gap-3 mb-3">
            <input type="number" min="0" value={goalsHome} onChange={e => setGoalsHome(e.target.value)}
              className="w-16 bg-bg3 border border-border2 rounded-lg px-2 py-1.5 text-center text-sm" />
            <span className="text-text3">—</span>
            <input type="number" min="0" value={goalsAway} onChange={e => setGoalsAway(e.target.value)}
              className="w-16 bg-bg3 border border-border2 rounded-lg px-2 py-1.5 text-center text-sm" />
            <span className="text-xs text-text2 ml-2">golos casa — fora</span>
          </div>
          <Button size="sm" onClick={submitResult} loading={loading} className="w-full">
            <Check size={13} className="mr-1" /> Confirmar Resultado e Pagar Apostas
          </Button>
        </motion.div>
      )}
    </Card>
  );
}

// ── Página principal de admin ─────────────────────────────────────────────────
export default function Admin() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('nc_admin_password'));
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/fixtures');
      setFixtures(data.fixtures || []);
    } catch (err) {
      if (err.response?.status === 401) setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">🛠️ Painel de Administração</h1>
          <p className="text-text2 text-sm mt-1">Gere jogos, odds e resultados das apostas</p>
        </div>
        <button onClick={() => { sessionStorage.removeItem('nc_admin_password'); setAuthed(false); }}
          className="text-xs text-text2 hover:text-red transition-colors">Sair</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <CreateFixtureForm onCreated={load} />
        </div>
        <div>
          <h3 className="font-bold text-sm text-text2 mb-3">Jogos Existentes ({fixtures.length})</h3>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : fixtures.length === 0 ? (
            <p className="text-text3 text-sm text-center py-8">Ainda não criaste nenhum jogo</p>
          ) : (
            <div className="space-y-3">
              {fixtures.map(f => <FixtureManageCard key={f.id} fixture={f} onChanged={load} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

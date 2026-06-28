import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('As passwords não coincidem');
      return;
    }
    setLoading(true);
    try {
      await register(username, email, password);
      toast.success('Conta criada com sucesso! 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <Card className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🎲</div>
          <h1 className="text-xl font-extrabold">BetZone</h1>
          <p className="text-text2 text-sm mt-1">Cria a tua conta</p>
        </div>
        <form onSubmit={submit}>
          <Input label="Username" value={username} onChange={e => setUsername(e.target.value)}
            minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" required autoFocus />
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
          <Input label="Confirmar Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={6} required />
          <Button type="submit" loading={loading} className="w-full py-3 mt-1">Criar Conta</Button>
        </form>
        <p className="text-center text-text2 text-sm mt-5">
          Já tens conta?{' '}
          <Link to="/login" className="text-orange font-semibold hover:underline">Entra aqui</Link>
        </p>
      </Card>
    </div>
  );
}

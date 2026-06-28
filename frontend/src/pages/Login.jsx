import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Bem-vindo de volta! 🎮');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao entrar');
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
          <p className="text-text2 text-sm mt-1">Entra na tua conta</p>
        </div>
        <form onSubmit={submit}>
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" loading={loading} className="w-full py-3 mt-1">Entrar</Button>
        </form>
        <p className="text-center text-text2 text-sm mt-5">
          Ainda não tens conta?{' '}
          <Link to="/register" className="text-orange font-semibold hover:underline">Cria uma agora</Link>
        </p>
      </Card>
    </div>
  );
}

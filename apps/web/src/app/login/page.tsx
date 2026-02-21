'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const authMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/login', { email, password });
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('kanban_token', data.token);

      if (data.user.mustChangePassword) {
        setMustChangePassword(true);
        toast('Por segurança, defina uma nova senha.', { icon: '🔒' });
      } else {
        queryClient.invalidateQueries({ queryKey: ['me'] });
        router.push('/');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Erro de autenticação.';
      setError(msg);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => await api.patch('/auth/change-password', { newPassword }),
    onSuccess: () => {
      toast.success('Senha atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao trocar senha.')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mustChangePassword) {
      if (newPassword.length < 6) { setError('A nova senha deve ter no mínimo 6 caracteres.'); return; }
      changePasswordMutation.mutate();
    } else {
      authMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-slate-200 transition-all">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-2">Kanban v2</h2>
        <p className="text-center text-slate-500 mb-6 text-sm">
          {mustChangePassword ? '🔒 Criação de Nova Senha' : 'Entre com suas credenciais'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mustChangePassword ? (
            <div className="animate-in fade-in zoom-in duration-300">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
              <input type="password" autoFocus value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha segura" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition" required minLength={6} />
              <p className="text-xs text-slate-400 mt-2">Você precisa definir uma nova senha no primeiro acesso.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required disabled={mustChangePassword} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required disabled={mustChangePassword} />
              </div>
            </>
          )}

          <button type="submit" disabled={authMutation.isPending || changePasswordMutation.isPending} className={`w-full font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2 shadow-sm ${mustChangePassword ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
            {authMutation.isPending || changePasswordMutation.isPending ? 'Processando...' : (mustChangePassword ? 'Salvar Nova Senha' : 'Entrar')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">Carregando...</div>}>
      <LoginContent />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('owner@kanban.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  
  const router = useRouter();
  const queryClient = useQueryClient();

  const authMutation = useMutation({
    mutationFn: async () => {
      if (isLogin) {
        const { data } = await api.post('/auth/login', { email, password });
        return data;
      } else {
        const { data } = await api.post('/auth/register', { name, email, password });
        return data;
      }
    },
    onSuccess: (data) => {
      localStorage.setItem('kanban_token', data.token);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/');
    },
    onError: (err: any) => {
      // Captura o erro customizado da nossa API (ex: "E-mail já está em uso")
      const msg = err.response?.data?.message || 'Erro de autenticação. Verifique os dados.';
      setError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    authMutation.mutate();
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    if (isLogin) {
      // Se for criar conta, limpa a tela
      setEmail('');
      setPassword('');
    } else {
      // Se for logar, volta para a sua master para facilitar os testes
      setEmail('owner@kanban.com');
      setPassword('123456');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-slate-200 transition-all">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-2">Kanban v2</h2>
        <p className="text-center text-slate-500 mb-6 text-sm">
          {isLogin ? 'Entre com suas credenciais para acessar' : 'Crie sua conta para começar a colaborar'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João da Silva" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required minLength={6} />
          </div>

          <button type="submit" disabled={authMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2 shadow-sm">
            {authMutation.isPending ? 'Processando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">
            {isLogin ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
            <button type="button" onClick={toggleMode} className="ml-1 text-blue-600 hover:text-blue-800 font-semibold transition-colors focus:outline-none">
              {isLogin ? 'Crie uma agora' : 'Faça login aqui'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, LogOut, Plus, ShieldAlert, Crown, UserCog, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newBoardName, setNewBoardName] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { data: userData, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/me')).data.user,
    retry: false
  });

  const { data: boards, isLoading: boardsLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => (await api.get('/boards')).data,
    enabled: !!userData
  });

  const createBoardMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/boards', { name });
      return data;
    },
    onSuccess: (newBoard) => {
      setNewBoardName('');
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      router.push(`/board/${newBoard.id}`);
    }
  });

  useEffect(() => {
    if (userError) {
      localStorage.removeItem('kanban_token');
      router.replace('/login');
    }
  }, [userError, router]);

  const handleLogout = () => {
    // 🔥 O Logout Implacável: Esvazia o cofre do navegador
    localStorage.removeItem('kanban_token');
    queryClient.clear();
    router.replace('/login');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBoardName.trim()) createBoardMutation.mutate(newBoardName.trim());
  };

  if (!mounted || userLoading) return null;



  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 text-blue-600">
          <LayoutDashboard size={24} />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Meus Projetos</h1>
        </div>

        {/* Identificação de Sessão Clara e Logout */}
        {userData && (
          <div className="flex items-center gap-4">
            {(userData.role === 'MASTER' || userData.role === 'ADMIN') && (
              <Link href="/admin" className="text-slate-500 hover:text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold" title="Painel Administrativo">
                <UserCog size={18} /> <span className="hidden sm:block">Admin</span>
              </Link>
            )}
            <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-full shadow-sm">
              <Link href="/profile" className="flex items-center gap-2 border-r border-slate-200 pr-4 hover:bg-slate-100 p-1 rounded-lg transition-colors group" title="Editar Perfil">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm group-hover:scale-105 transition-transform">
                  {userData.name?.substring(0, 2)}
                </div>
                <div className="hidden sm:flex sm:flex-col sm:justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700 leading-none group-hover:text-blue-600 transition-colors">{userData.name}</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 mt-0.5">{userData.email}</span>
                </div>
              </Link>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-semibold" title="Sair do Sistema">
                <LogOut size={16} /> <span className="hidden sm:block">Sair</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-6 mt-6">
        <form onSubmit={handleCreate} className="mb-10 flex gap-3">
          <input type="text" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="Nome do novo projeto..." className="flex-1 max-w-sm px-4 py-3 rounded-xl border border-slate-300 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium text-slate-700" />
          <button type="submit" disabled={createBoardMutation.isPending || !newBoardName.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2">
            <Plus size={18} /> Criar Quadro
          </button>
        </form>

        {boardsLoading ? (
          <div className="flex items-center gap-3 text-slate-500 font-medium"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> Carregando seus projetos...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {boards?.map((board: any) => (
              <Link key={board.id} href={`/board/${board.id}`} className="group relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col h-40">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">{board.name}</h2>
                </div>
                <div className="mt-auto flex items-center justify-between text-xs text-slate-400 font-medium">
                  {/* Etiquetas Inteligentes (Dono vs Membro vs Supervisão) */}
                  {board.createdById === userData.id ? (
                    <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 flex items-center gap-1 font-bold"><Crown size={12} /> Seu Projeto</span>
                  ) : board.members?.some((m: any) => m.userId === userData.id) ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 flex items-center gap-1 font-bold"><ShieldAlert size={12} /> Compartilhado</span>
                  ) : (userData.role === 'MASTER') ? (
                    <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 flex items-center gap-1 font-bold"><Shield size={12} /> {board.createdBy?.name || 'Supervisão'}</span>
                  ) : null}
                  <span className="group-hover:translate-x-1 transition-transform">Entrar &rarr;</span>
                </div>
              </Link>
            ))}

            {boards?.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <LayoutDashboard size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-1">Nenhum projeto encontrado</h3>
                <p className="text-slate-500 text-sm">Crie seu primeiro quadro ou aguarde um convite da equipe.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Users, LogOut, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isError: userError, isLoading: userLoading } = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get('/me')).data.user, retry: false });
  const { data: boards, isLoading: boardsLoading } = useQuery({ queryKey: ['boards'], queryFn: async () => (await api.get('/boards')).data, enabled: !!user });

  const createBoardMutation = useMutation({
    mutationFn: async (name: string) => await api.post('/boards', { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards'] })
  });

  useEffect(() => { if (userError) router.replace('/login'); }, [userError, router]);

  const handleCreateBoard = () => {
    const name = window.prompt('Qual o nome do novo projeto/quadro?');
    if (name?.trim()) createBoardMutation.mutate(name.trim());
  };

  if (userLoading || boardsLoading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Carregando ambiente...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-blue-600">
          <LayoutDashboard size={24} />
          <h1 className="text-xl font-bold text-slate-900">Kanban v2</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
            <Users size={16} /> {user.name}
          </div>
          <button onClick={async () => { await api.post('/auth/logout'); queryClient.clear(); router.replace('/login'); }} className="text-slate-500 hover:text-red-600 transition-colors p-2"><LogOut size={20} /></button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Meus Projetos</h2>
          <button onClick={handleCreateBoard} disabled={createBoardMutation.isPending} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm">
            <Plus size={20} /> Novo Quadro
          </button>
        </div>
        
        {boards?.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 flex flex-col items-center text-center">
            <LayoutDashboard size={48} className="text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Nenhum quadro encontrado</h3>
            <p className="text-slate-500 mt-1 max-w-sm">Você ainda não tem nenhum projeto em andamento. Clique no botão acima para criar o seu primeiro quadro e comece a organizar suas tarefas!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {boards?.map((board: any) => (
              <Link key={board.id} href={`/board/${board.id}`} className="group flex flex-col bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors"><LayoutDashboard size={20} /></div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{board.name}</h3>
                <p className="text-sm text-slate-500 mt-auto pt-4 flex items-center gap-1 group-hover:text-blue-600 transition-colors font-medium">Acessar quadro &rarr;</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

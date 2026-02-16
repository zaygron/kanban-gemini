'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Users, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isError: userError, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/me');
      return res.data.user;
    },
    retry: false
  });

  const { data: boards, isLoading: boardsLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const res = await api.get('/boards');
      return res.data;
    },
    enabled: !!user
  });

  useEffect(() => {
    if (userError) router.replace('/login');
  }, [userError, router]);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    queryClient.clear();
    router.replace('/login');
  };

  if (userLoading || boardsLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Carregando...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-blue-600">
          <LayoutDashboard size={24} />
          <h1 className="text-xl font-bold text-slate-900">Kanban v2</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
            <Users size={16} />
            <span className="font-medium">{user.name}</span>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-600 transition-colors" title="Sair">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Meus Quadros</h2>
        
        {boards?.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
            <p className="text-slate-500">Você ainda não participa de nenhum quadro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {boards?.map((board: any) => (
              <Link 
                key={board.id} 
                href={`/board/${board.id}`}
                className="group block bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-500 transition-all cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{board.name}</h3>
                <p className="text-sm text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Acessar quadro colaborativo &rarr;
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

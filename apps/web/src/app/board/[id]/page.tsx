'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Board } from '@/components/board/Board';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, LayoutDashboard } from 'lucide-react';
import { useEffect } from 'react';

export default function BoardPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ['board', id],
    queryFn: async () => {
      const res = await api.get(`/kanban/board/${id}`);
      return res.data;
    },
    retry: false
  });

  useEffect(() => {
    if (isError) router.replace('/');
  }, [isError, router]);

  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium gap-3"><Loader2 className="animate-spin text-blue-500" size={28} /> Sincronizando quadro colaborativo...</div>;
  if (!data) return null;

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2 text-blue-600">
            <LayoutDashboard size={24} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{data.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 shadow-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> Sincronização em Tempo Real
        </div>
      </header>
      <main className="flex-1 p-6 overflow-x-auto overflow-y-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <Board initialData={data} />
      </main>
    </div>
  );
}

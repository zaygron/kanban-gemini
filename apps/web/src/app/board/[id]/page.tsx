'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Board } from '@/components/board/Board';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, LayoutDashboard, Edit2, UserPlus, LogOut, Archive, ArchiveRestore } from 'lucide-react';
import { ShareModal } from '@/components/board/ShareModal';

export default function BoardPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get('/me')).data.user });
  const { data, isLoading, isError } = useQuery({
    queryKey: ['board', id, showArchived],
    queryFn: async () => (await api.get(`/kanban/board/${id}?includeArchived=${showArchived}`)).data,
    retry: false
  });
  const { data: membersData } = useQuery({ queryKey: ['boardMembers', id], queryFn: async () => (await api.get(`/kanban/board/${id}/members`)).data, enabled: !!data });

  useEffect(() => { if (isError) router.replace('/'); }, [isError, router]);
  useEffect(() => { if (data?.name && !isEditingBoard) setBoardName(data.name); }, [data?.name, isEditingBoard]);

  const updateBoardMutation = useMutation({
    mutationFn: async (newName: string) => await api.patch(`/kanban/board/${id}`, { name: newName }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['board', id] }); queryClient.invalidateQueries({ queryKey: ['boards'] }); },
  });

  const handleSaveBoardName = () => { setIsEditingBoard(false); if (boardName.trim() && boardName.trim() !== data?.name) updateBoardMutation.mutate(boardName.trim()); else setBoardName(data?.name || ''); };
  const handleLogout = () => { localStorage.removeItem('kanban_token'); queryClient.clear(); router.replace('/login'); };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-stone-500 font-medium gap-3 bg-[#F4F1ED]"><Loader2 className="animate-spin text-[#7A1D22]" size={28} /> Sincronizando...</div>;
  if (!data) return null;

  const isOwner = user?.id === data.createdById;

  return (
    <div className="h-screen bg-[#F4F1ED] flex flex-col overflow-hidden">
      {/* 🔥 IDENTIDADE: O Cabeçalho Vinho Profundo */}
      <header className="bg-[#7A1D22] border-b border-[#5C1519] px-6 py-4 flex items-center justify-between shadow-md shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"><ArrowLeft size={20} /></Link>
          <div className="h-6 w-px bg-white/20"></div>
          <div className="flex items-center gap-2 text-white group">
            <LayoutDashboard size={24} className="opacity-90" />
            {isEditingBoard && isOwner ? (
              <input autoFocus value={boardName} onChange={(e) => setBoardName(e.target.value)} onBlur={handleSaveBoardName} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBoardName(); else if (e.key === 'Escape') { setIsEditingBoard(false); setBoardName(data.name); } }} className="text-xl font-bold text-[#7A1D22] tracking-tight bg-white border border-transparent rounded px-2 -mx-2 outline-none w-64 shadow-sm" />
            ) : (
              <div onClick={() => isOwner && setIsEditingBoard(true)} className={`flex items-center gap-2 ${isOwner ? 'cursor-text hover:bg-white/10 rounded px-2 py-0.5 -mx-2 transition-colors' : ''}`} title={isOwner ? "Editar nome do quadro" : "Apenas o dono pode renomear"}>
                <h1 className="text-xl font-bold text-white tracking-tight">{data.name}</h1>
                {isOwner && <Edit2 size={14} className="text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-3 pr-3 md:pr-4 border-r border-white/20">
            {membersData && (
              <div className="flex -space-x-2 overflow-hidden">
                {membersData.owner && (
                  <div className="inline-flex h-8 w-8 rounded-full ring-2 ring-[#7A1D22] bg-[#3B82F6] items-center justify-center text-xs font-bold text-white shadow-sm cursor-help" title={`Dono: ${membersData.owner?.name}`}>
                    {membersData.owner?.name?.substring(0, 2).toUpperCase()}
                  </div>
                )}
                {membersData.members?.map((m: any) => (
                  <div key={m.id} className="inline-flex h-8 w-8 rounded-full ring-2 ring-[#7A1D22] bg-[#10B981] items-center justify-center text-xs font-bold text-white shadow-sm cursor-help" title={`Membro: ${m.name}`}>
                    {m.name.substring(0, 2).toUpperCase()}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-1.5 text-sm font-semibold text-white bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl hover:bg-white/20 transition-colors shadow-sm">
              <UserPlus size={16} /> <span className="hidden sm:inline">Equipe</span>
            </button>
            <button onClick={() => setShowArchived(!showArchived)} className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-colors shadow-sm ${showArchived ? 'bg-amber-400 text-[#7A1D22] border-amber-500' : 'text-white bg-white/10 border border-white/20 hover:bg-white/20'}`} title={showArchived ? "Ocultar itens arquivados" : "Mostrar itens arquivados"}>
              {showArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              <span className="hidden sm:inline">{showArchived ? 'Ocultar Arquivados' : 'Ver Arquivados'}</span>
            </button>
          </div>

          <div className="items-center gap-2 bg-[#5C1519] border border-[#4A1114] px-3 py-1.5 rounded-full text-xs font-bold text-emerald-400 shadow-inner hidden md:flex">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Tempo Real
          </div>

          {user && (
            <div className="pl-1 md:pl-2 flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-white/50 uppercase leading-none">Logado</span>
                <span className="text-sm font-bold text-white leading-tight">{user.name.split(' ')[0]}</span>
              </div>
              <button onClick={handleLogout} className="text-white/70 hover:text-white transition-colors bg-transparent p-2 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/20" title="Sair do Sistema">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 🔥 IDENTIDADE: Fundo Bege Quente Liso (Sem Textura para parecer App Desktop) */}
      <main className="flex-1 p-6 overflow-x-auto overflow-y-hidden bg-[#F4F1ED]">
        <Board initialData={data} showArchived={showArchived} />
      </main>

      {isShareModalOpen && <ShareModal boardId={id as string} onClose={() => setIsShareModalOpen(false)} isOwner={isOwner} />}
    </div>
  );
}

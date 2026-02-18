import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Maximize2, AlignLeft, Calendar, Flag, Lock } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { TaskModal } from './TaskModal';

// 🔥 IDENTIDADE MÁGICA: Gerador de cor do Avatar baseado no nome do usuário
const getAvatarColor = (name: string) => {
  const colors = ['bg-[#5C3A58]', 'bg-[#3A5A81]', 'bg-[#537A5A]', 'bg-[#7A4B3A]', 'bg-[#2C3E50]'];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export function TaskCard({ task, isOverlay, isRestricted, userId }: { task: any, isOverlay?: boolean, isRestricted?: boolean, userId?: string }) {
  const queryClient = useQueryClient();
  const params = useParams();
  const boardId = params?.id as string;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { setEditTitle(task.title); }, [task.title]);

  const { data } = useQuery({ queryKey: ['boardMembers', boardId], enabled: !!boardId });
  const membersData = data as any;
  
  const canEdit = !isRestricted || task.assignedTo === userId;

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ 
    id: task.id, 
    data: { type: 'Task', task },
    disabled: !canEdit 
  });

  let assignee = null;
  if (task.assignedTo && membersData) {
    if (membersData.owner?.id === task.assignedTo) assignee = membersData.owner;
    else assignee = membersData.members?.find((m: any) => m.id === task.assignedTo);
  }

  const updateTaskMutation = useMutation({
    mutationFn: async (newTitle: string) => await api.patch(`/kanban/tasks/${task.id}`, { title: newTitle }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => await api.delete(`/kanban/tasks/${task.id}`),
    onSuccess: () => { toast.success('Tarefa excluída!'); queryClient.invalidateQueries({ queryKey: ['board'] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao excluir.')
  });

  const handleSave = () => {
    setIsEditing(false);
    if (editTitle.trim() && editTitle.trim() !== task.title) updateTaskMutation.mutate(editTitle.trim());
    else setEditTitle(task.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') { setIsEditing(false); setEditTitle(task.title); }
  };

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging && !isOverlay ? 0.3 : 1 };
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));
  
  // 🔥 IDENTIDADE: Cores de Etiquetas padronizadas
  const priorityColors: Record<string, string> = { HIGH: 'bg-[#F4E3E4] text-[#7A1D22] border-[#E8C4C6]', MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200', LOW: 'bg-stone-50 text-stone-600 border-stone-200' };
  const priorityLabels: Record<string, string> = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' };

  return (
    <>
      <div ref={setNodeRef} style={style} className={`group bg-white p-3.5 rounded-xl shadow-sm border flex flex-col gap-2 relative transition-all ${isOverlay ? 'border-[#7A1D22] shadow-xl rotate-2 scale-105 z-40' : 'border-[#D6D2CF] hover:border-[#7A1D22]/50 hover:shadow-md mb-3'} ${!canEdit && !isOverlay ? 'bg-[#F4F1ED]/70' : ''}`}>
        <div className="flex items-start gap-2">
          {canEdit ? (
            <div {...attributes} {...listeners} className="mt-0.5 text-[#C8C4BF] hover:text-[#7A1D22] cursor-grab active:cursor-grabbing outline-none touch-none shrink-0"><GripVertical size={16} /></div>
          ) : (
            <div className="mt-0.5 text-[#C8C4BF] cursor-not-allowed shrink-0" title="Acesso Restrito"><Lock size={14} /></div>
          )}
          
          <div className="flex-1 pr-12">
            {isEditing && !isOverlay && canEdit ? (
              <textarea autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} onPointerDown={(e) => e.stopPropagation()} className="w-full text-sm font-medium text-stone-800 bg-[#7A1D22]/5 border border-[#7A1D22]/30 rounded px-1 -mx-1 outline-none resize-none overflow-hidden leading-snug" rows={1} onInput={(e) => { const target = e.target as HTMLTextAreaElement; target.style.height = 'auto'; target.style.height = `${target.scrollHeight}px`; }} />
            ) : (
              <p onClick={() => !isOverlay && canEdit && setIsEditing(true)} className={`text-[14px] font-medium text-[#4A4A4A] leading-snug break-words whitespace-pre-wrap min-h-[20px] ${canEdit ? 'cursor-text hover:bg-stone-50 rounded px-1 -mx-1 transition-colors' : 'cursor-default'}`}>{task.title}</p>
            )}
          </div>
          
          {!isOverlay && !isEditing && (
            <div className="absolute right-2 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 pl-2">
              <button onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }} className="text-[#A39E99] hover:text-[#7A1D22] hover:bg-[#7A1D22]/10 p-1.5 rounded-md transition-colors border border-transparent hover:border-[#7A1D22]/20" title={canEdit ? "Editar" : "Ver Detalhes"}><Maximize2 size={14} /></button>
              {!isRestricted && (
                <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir esta tarefa?')) deleteTaskMutation.mutate(); }} className="text-[#A39E99] hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors border border-transparent hover:border-red-100" title="Excluir"><Trash2 size={14} /></button>
              )}
            </div>
          )}
        </div>

        {(task.description || task.dueDate || (task.priority && task.priority !== 'MEDIUM') || assignee) && (
          <div className="flex items-end justify-between mt-1 pl-6 min-h-[24px]">
            <div className="flex flex-wrap items-center gap-2">
              {task.priority && task.priority !== 'MEDIUM' && (
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${priorityColors[task.priority]}`}><Flag size={10} /> {priorityLabels[task.priority]}</div>
              )}
              {task.description && <div className="text-[#A39E99] bg-[#F4F1ED] p-1 rounded-md border border-[#D6D2CF]"><AlignLeft size={12} /></div>}
              {task.dueDate && <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${isOverdue ? 'bg-red-50 text-red-600 border-red-200' : 'bg-[#F4E3E4] text-[#7A1D22] border-[#E8C4C6]'}`}><Calendar size={12} /> {new Date(task.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short' })}</div>}
            </div>
            {/* 🔥 IDENTIDADE: O Avatar de responsabilidade nas Cores Elegantes */}
            {assignee && <div className={`w-6 h-6 rounded-full ${getAvatarColor(assignee.name)} text-white flex items-center justify-center font-bold text-[10px] uppercase ring-2 ring-white shadow-sm shrink-0 ml-auto`} title={`Responsável: ${assignee.name}`}>{assignee.name.substring(0, 2)}</div>}
          </div>
        )}
      </div>

      {isModalOpen && !isOverlay && <TaskModal task={task} canEdit={canEdit} onClose={() => setIsModalOpen(false)} />}
    </>
  );
}

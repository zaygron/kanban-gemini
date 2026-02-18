import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Plus, GripHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';

export function Column({ column, tasks, isRestricted, userId, isOverlay }: { column: any, tasks: any[], isRestricted: boolean, userId: string, isOverlay?: boolean }) {
  const queryClient = useQueryClient();
  
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ 
    id: column.id, 
    data: { type: 'Column', column },
    disabled: isRestricted
  });
  
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  useEffect(() => { setEditTitle(column.title); }, [column.title]);

  const createTaskMutation = useMutation({
    mutationFn: async (title: string) => await api.post('/kanban/tasks', { title, columnId: column.id, order: tasks.length }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['board'] }); setNewTaskTitle(''); setIsAddingTask(false); }
  });

  const updateColumnMutation = useMutation({
    mutationFn: async (newTitle: string) => await api.patch(`/kanban/columns/${column.id}`, { title: newTitle }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board'] }),
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Erro ao renomear.'); setEditTitle(column.title); }
  });

  const handleSaveTask = () => { if (newTaskTitle.trim()) createTaskMutation.mutate(newTaskTitle.trim()); else setIsAddingTask(false); };

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (editTitle.trim() && editTitle.trim() !== column.title) updateColumnMutation.mutate(editTitle.trim());
    else setEditTitle(column.title);
  };

  const handleKeyDownTitle = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSaveTitle(); }
    if (e.key === 'Escape') { setIsEditingTitle(false); setEditTitle(column.title); }
  };

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging && !isOverlay ? 0.3 : 1 };

  return (
    // 🔥 IDENTIDADE: Fundo da Coluna em "Stone/Areia"
    <div ref={setNodeRef} style={style} className={`bg-[#EBE8E4] w-80 shrink-0 rounded-2xl flex flex-col h-full border overflow-hidden ${isOverlay ? 'border-[#7A1D22] shadow-2xl rotate-2 scale-105 z-50' : 'border-[#D6D2CF] shadow-sm'}`}>
      
      {/* 🔥 IDENTIDADE: Cabeçalho Vinho da Coluna com Contador Circulado */}
      <div className="p-4 border-b border-[#5C1519] bg-[#7A1D22] flex justify-between items-start sticky top-0 z-10 min-h-[56px] group rounded-t-2xl">
        <div className="flex-1 pr-2 flex items-start gap-1">
          {!isRestricted && !isOverlay && (
            <div ref={setActivatorNodeRef} {...attributes} {...listeners} className="mt-0.5 text-white/40 hover:text-white cursor-grab active:cursor-grabbing outline-none touch-none shrink-0 p-0.5 -ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Arrastar Lista">
              <GripHorizontal size={18} />
            </div>
          )}

          <div className="flex-1">
            {isEditingTitle && !isRestricted && !isOverlay ? (
              <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={handleSaveTitle} onKeyDown={handleKeyDownTitle} className="w-full text-[15px] font-bold text-[#7A1D22] tracking-tight leading-snug bg-white border border-transparent rounded px-1.5 py-0.5 -mx-1.5 outline-none shadow-sm" />
            ) : (
              <h3 onClick={() => !isRestricted && !isOverlay && setIsEditingTitle(true)} className={`font-bold text-white tracking-tight leading-snug text-[15px] break-words whitespace-pre-wrap ${!isRestricted ? 'cursor-text hover:bg-white/10 rounded px-1.5 py-0.5 -mx-1.5 transition-colors' : 'cursor-default'}`} title={!isRestricted ? "Clique para renomear" : ""}>
                {column.title}
              </h3>
            )}
          </div>
        </div>
        
        <span className="bg-white text-[#7A1D22] text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm shrink-0 mt-0.5">{tasks.length}</span>
      </div>
      
      <div className="p-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#C8C4BF] min-h-[150px]">
        {!isOverlay ? (
          <SortableContext items={tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0 pb-2">
              {tasks.map((task: any) => (
                <TaskCard key={task.id} task={task} isRestricted={isRestricted} userId={userId} />
              ))}
            </div>
          </SortableContext>
        ) : (
          <div className="flex flex-col gap-0 pb-2">
            {tasks.map((task: any) => (
              <TaskCard key={task.id} task={task} isRestricted={isRestricted} userId={userId} />
            ))}
          </div>
        )}
        
        {!isRestricted && !isOverlay && (
          <div className="mt-1">
            {isAddingTask ? (
              <div className="bg-white p-3 rounded-xl border border-[#7A1D22]/50 shadow-md transform transition-all">
                <textarea autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onBlur={handleSaveTask} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveTask(); } if (e.key === 'Escape') setIsAddingTask(false); }} placeholder="O que precisa ser feito?" className="w-full text-sm font-medium text-stone-800 bg-transparent outline-none resize-none overflow-hidden leading-snug placeholder:text-stone-400 placeholder:font-normal" rows={2} />
              </div>
            ) : (
              <button onClick={() => setIsAddingTask(true)} className="w-full flex items-center gap-2 py-2.5 px-3 text-sm font-semibold text-[#8C8782] hover:text-[#7A1D22] hover:bg-white/60 rounded-xl transition-all border border-transparent hover:border-[#7A1D22]/20 hover:shadow-sm">
                <Plus size={16} /> Adicionar Cartão
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

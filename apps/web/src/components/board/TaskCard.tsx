import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export function TaskCard({ task, isOverlay }: { task: any, isOverlay?: boolean }) {
  const queryClient = useQueryClient();
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/kanban/tasks/${task.id}`);
    },
    onSuccess: () => {
      toast.success('Tarefa excluída!');
      queryClient.invalidateQueries(); 
    },
    onError: () => toast.error('Erro ao excluir a tarefa.')
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white p-3 rounded-xl shadow-sm border flex gap-2 items-start relative
        ${isOverlay ? 'border-blue-500 shadow-xl rotate-2 scale-105 z-50' : 'border-slate-200 hover:border-blue-300 mb-3'}
      `}
    >
      <div {...attributes} {...listeners} className="mt-0.5 text-slate-300 hover:text-blue-500 cursor-grab active:cursor-grabbing outline-none touch-none">
        <GripVertical size={16} />
      </div>
      
      <div className="flex-1 pr-6">
        <p className="text-sm font-medium text-slate-800 leading-snug break-words">{task.title}</p>
      </div>

      {!isOverlay && (
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (confirm('Tem certeza que deseja excluir esta tarefa?')) deleteTaskMutation.mutate(); 
          }}
          className="absolute right-2 top-3 text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
          title="Excluir Tarefa"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

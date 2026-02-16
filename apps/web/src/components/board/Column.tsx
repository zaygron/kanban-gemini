import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export function Column({ column, boardId }: { column: any, boardId: string }) {
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: 'Column', column } });
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();

  const addTaskMutation = useMutation({
    mutationFn: async (t: string) => {
      const order = column.tasks?.length > 0 ? column.tasks[column.tasks.length - 1].order + 1000 : 1000;
      await api.post('/kanban/tasks', { title: t, columnId: column.id, order });
    },
    onSuccess: () => { 
      toast.success('Tarefa criada!');
      queryClient.invalidateQueries({ queryKey: ['board', boardId] }); 
      setIsAdding(false); 
      setTitle(''); 
    },
    onError: () => toast.error('Falha ao criar tarefa.')
  });

  return (
    <div className="bg-slate-100/90 rounded-2xl w-[320px] shrink-0 flex flex-col max-h-full border border-slate-200 shadow-sm">
      <div className="p-4 flex items-center justify-between border-b border-slate-200/60 bg-slate-100/50 rounded-t-2xl">
        <h3 className="font-semibold text-slate-800 tracking-tight">{column.title}</h3>
        <span className="bg-white border border-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">{column.tasks?.length || 0}</span>
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-3 min-h-[150px] scrollbar-thin">
        <SortableContext items={(column.tasks || []).map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {(column.tasks || []).map((task: any) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {isAdding ? (
          <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) addTaskMutation.mutate(title); }} className="mt-1">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="O que será feito?" className="w-full text-sm px-3 py-2.5 border border-slate-300 shadow-sm rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
            <div className="flex gap-2 mt-2">
              <button type="submit" disabled={addTaskMutation.isPending} className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors">Salvar</button>
              <button type="button" onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-slate-800 hover:bg-slate-200 text-xs px-3 py-2 rounded-lg font-medium transition-colors">Cancelar</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 w-full p-2.5 hover:bg-slate-200/70 border border-dashed border-transparent hover:border-slate-300 rounded-xl transition-all mt-1 font-medium">
            <Plus size={18} /> Adicionar Cartão
          </button>
        )}
      </div>
    </div>
  );
}

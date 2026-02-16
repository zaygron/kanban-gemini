'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export function calcPos(prevOrder?: number, nextOrder?: number): number {
  if (prevOrder === undefined && nextOrder === undefined) return 1000;
  if (prevOrder === undefined) return nextOrder! / 2;
  if (nextOrder === undefined) return prevOrder! + 1000;
  return (prevOrder + nextOrder) / 2;
}

export function Board({ initialData }: { initialData: any }) {
  const [board, setBoard] = useState(initialData);
  const [activeTask, setActiveTask] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => { setBoard(initialData); }, [initialData]);

  useEffect(() => {
    const socket = io('http://localhost:3001', { withCredentials: true, transports: ['websocket'] });
    socket.on('boardUpdated', () => queryClient.invalidateQueries({ queryKey: ['board', board.id] }));
    return () => { socket.disconnect(); };
  }, [board.id, queryClient]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: any }) => {
      await api.patch(`/kanban/tasks/${taskId}`, data);
    },
    onError: () => {
      toast.error('Erro de conexão ao salvar movimento.');
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['board', board.id] })
  });

  const addColumnMutation = useMutation({
    mutationFn: async (title: string) => {
      const order = board.columns?.length > 0 ? board.columns[board.columns.length - 1].order + 1000 : 1000;
      await api.post('/kanban/columns', { title, boardId: board.id, order });
    },
    onSuccess: () => {
      toast.success('Lista criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
    },
    onError: () => toast.error('Falha ao criar nova lista.')
  });

  const handleDragStart = (e: DragStartEvent) => {
    if (e.active.data.current?.type === 'Task') setActiveTask(e.active.data.current.task);
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || active.data.current?.type !== 'Task') return;

    const isOverColumn = over.data.current?.type === 'Column';

    setBoard((prev: any) => {
      const activeColIndex = (prev.columns || []).findIndex((col: any) => (col.tasks || []).some((t: any) => t.id === active.id));
      const overColIndex = isOverColumn 
        ? (prev.columns || []).findIndex((col: any) => col.id === over.id)
        : (prev.columns || []).findIndex((col: any) => (col.tasks || []).some((t: any) => t.id === over.id));

      if (activeColIndex === -1 || overColIndex === -1 || activeColIndex === overColIndex) return prev;

      const newCols = [...prev.columns];
      const taskObj = newCols[activeColIndex].tasks.find((t: any) => t.id === active.id);

      newCols[activeColIndex] = { ...newCols[activeColIndex], tasks: newCols[activeColIndex].tasks.filter((t: any) => t.id !== active.id) };
      
      const newOverTasks = [...newCols[overColIndex].tasks];
      if (isOverColumn) {
        newOverTasks.push({ ...taskObj, columnId: newCols[overColIndex].id });
      } else {
        const overTaskIndex = newOverTasks.findIndex((t: any) => t.id === over.id);
        const modifier = (over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height) ? 1 : 0;
        newOverTasks.splice(overTaskIndex + modifier, 0, { ...taskObj, columnId: newCols[overColIndex].id });
      }
      newCols[overColIndex] = { ...newCols[overColIndex], tasks: newOverTasks };
      
      return { ...prev, columns: newCols };
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const activeCol = (board.columns || []).find((col: any) => (col.tasks || []).some((t: any) => t.id === active.id));
    const overCol = (board.columns || []).find((col: any) => col.id === over.id) || (board.columns || []).find((col: any) => (col.tasks || []).some((t: any) => t.id === over.id));

    if (!activeCol || !overCol) return;

    let finalTasks = [...overCol.tasks];
    let newIndex = finalTasks.findIndex((t: any) => t.id === active.id);

    if (activeCol.id === overCol.id) {
       const oldIndex = finalTasks.findIndex((t: any) => t.id === active.id);
       const overIndex = finalTasks.findIndex((t: any) => t.id === over.id);
       if (oldIndex !== overIndex) {
           finalTasks = arrayMove(finalTasks, oldIndex, overIndex);
           newIndex = overIndex;
           setBoard((prev: any) => ({
             ...prev, columns: prev.columns.map((c: any) => c.id === overCol.id ? { ...c, tasks: finalTasks } : c)
           }));
       }
    }

    const targetTask = finalTasks[newIndex];
    if (!targetTask) return;

    const prevOrder = finalTasks[newIndex - 1]?.order;
    const nextOrder = finalTasks[newIndex + 1]?.order;
    const newOrder = calcPos(prevOrder, nextOrder);
    
    if (activeCol.id !== overCol.id || newOrder !== targetTask.order) {
       moveTaskMutation.mutate({ taskId: active.id as string, data: { columnId: overCol.id, order: newOrder } });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-6 h-full items-start overflow-x-auto pb-4">
        {(board.columns || []).map((col: any) => (
          <Column key={col.id} column={col} boardId={board.id} />
        ))}
        <button 
          onClick={() => { const t = prompt('Nome da Nova Lista:'); if(t && t.trim()) addColumnMutation.mutate(t); }}
          className="shrink-0 w-80 bg-slate-200/50 hover:bg-white border-2 border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 rounded-2xl flex items-center justify-center gap-2 text-slate-500 font-medium transition-all h-[100px]"
        >
          <Plus size={20} /> Criar Nova Lista
        </button>
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

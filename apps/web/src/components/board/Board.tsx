import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { socket } from '@/lib/socket';

export function Board({ initialData, showArchived }: { initialData: any, showArchived: boolean }) {
  const queryClient = useQueryClient();

  const [columns, setColumns] = useState<any[]>(initialData?.columns || []);

  const [activeTask, setActiveTask] = useState<any>(null);
  const [activeColumn, setActiveColumn] = useState<any>(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get('/me')).data.user });
  const userId = user?.id;

  const { data: boardData } = useQuery({
    queryKey: ['board', initialData.id, showArchived],
    queryFn: async () => (await api.get(`/kanban/board/${initialData.id}?includeArchived=${showArchived}`)).data,
    initialData: initialData,
  });

  const isRestricted = boardData?.userRole === 'RESTRICTED';

  useEffect(() => { if (boardData?.columns) setColumns(boardData.columns); }, [boardData]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kanban_token') : null;
    socket.auth = { token };
    socket.connect();

    socket.emit('board.join', { boardId: initialData.id });

    socket.on('boardUpdated', (data) => { if (data.boardId === initialData.id) queryClient.invalidateQueries({ queryKey: ['board', initialData.id] }); });
    return () => {
      socket.off('boardUpdated');
      socket.disconnect();
    };
  }, [initialData.id, queryClient]);

  const updateTaskPosition = useMutation({
    mutationFn: async ({ taskId, columnId, order }: any) => await api.patch(`/kanban/tasks/${taskId}`, { columnId, order }),
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Acesso negado.'); queryClient.invalidateQueries({ queryKey: ['board', initialData.id] }); }
  });

  const updateColumnPosition = useMutation({
    mutationFn: async ({ columnId, order }: any) => await api.patch(`/kanban/columns/${columnId}`, { order }),
    onError: (err: any) => { toast.error(err.response?.data?.message || 'Erro ao mover lista.'); queryClient.invalidateQueries({ queryKey: ['board', initialData.id] }); }
  });

  const createColumnMutation = useMutation({
    mutationFn: async (title: string) => await api.post('/kanban/columns', { title, boardId: initialData.id, order: columns.length }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board', initialData.id] })
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === 'Column') {
      setActiveColumn(active.data.current.column);
      return;
    }
    if (type === 'Task') {
      const col = columns.find((c: any) => c.tasks.some((t: any) => t.id === active.id));
      setActiveTask(col?.tasks.find((t: any) => t.id === active.id));
      return;
    }
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isActiveTask = active.data.current?.type === 'Task';
    if (!isActiveTask) return;

    const activeId = active.id;
    const overId = over.id;

    const activeColIndex = columns.findIndex((c: any) => c.tasks.some((t: any) => t.id === activeId));
    let overColIndex = -1;

    if (over.data.current?.type === 'Task') {
      overColIndex = columns.findIndex((c: any) => c.tasks.some((t: any) => t.id === overId));
    } else if (over.data.current?.type === 'Column') {
      overColIndex = columns.findIndex((c: any) => c.id === overId);
    }

    if (activeColIndex === -1 || overColIndex === -1 || activeColIndex === overColIndex) return;

    setColumns((prev: any[]) => {
      const activeCol = prev[activeColIndex];
      const overCol = prev[overColIndex];
      const taskIndex = activeCol.tasks.findIndex((t: any) => t.id === activeId);
      const task = activeCol.tasks[taskIndex];

      return prev.map((c: any, i: number) => {
        if (i === activeColIndex) return { ...c, tasks: c.tasks.filter((t: any) => t.id !== activeId) };
        if (i === overColIndex) {
          const overTaskIndex = over.data.current?.type === 'Task' ? overCol.tasks.findIndex((t: any) => t.id === overId) : overCol.tasks.length;
          const newIndex = overTaskIndex >= 0 ? overTaskIndex : overCol.tasks.length;
          const newTasks = [...overCol.tasks];
          newTasks.splice(newIndex, 0, { ...task, columnId: overCol.id });
          return { ...c, tasks: newTasks };
        }
        return c;
      });
    });
  };

  const handleDragEnd = (event: any) => {
    setActiveTask(null);
    setActiveColumn(null);

    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;

    if (activeType === 'Column') {
      const activeId = active.id;
      const overId = over.id;

      const activeColIndex = columns.findIndex((c: any) => c.id === activeId);
      const overColIndex = columns.findIndex((c: any) => c.id === overId);

      if (activeColIndex !== overColIndex && activeColIndex !== -1 && overColIndex !== -1) {
        let newCols = arrayMove(columns, activeColIndex, overColIndex);

        let newOrder = 0;
        const prevCol: any = newCols[overColIndex - 1];
        const nextCol: any = newCols[overColIndex + 1];

        if (prevCol && nextCol) newOrder = (prevCol.order + nextCol.order) / 2.0;
        else if (prevCol) newOrder = prevCol.order + 1.0;
        else if (nextCol) newOrder = nextCol.order / 2.0;
        else newOrder = 1.0;

        newCols[overColIndex] = { ...newCols[overColIndex], order: newOrder };
        setColumns(newCols);
        updateColumnPosition.mutate({ columnId: active.id, order: newOrder });
      }
      return;
    }

    if (activeType === 'Task') {
      const activeId = active.id;
      const overId = over.id;

      const activeColIndex = columns.findIndex((c: any) => c.tasks.some((t: any) => t.id === activeId));
      if (activeColIndex === -1) return;

      const activeCol = columns[activeColIndex];
      const taskIndex = activeCol.tasks.findIndex((t: any) => t.id === activeId);
      const task = activeCol.tasks[taskIndex];

      if (isRestricted && task.assignedTo !== userId) {
        toast.error("Acesso Restrito: Apenas o responsável pode mover a tarefa.");
        queryClient.invalidateQueries({ queryKey: ['board', initialData.id] });
        return;
      }

      const overColIndex = columns.findIndex((c: any) => c.id === overId || c.tasks.some((t: any) => t.id === overId));
      if (overColIndex === -1) return;

      const overCol = columns[overColIndex];
      let overTaskIndex = overCol.tasks.findIndex((t: any) => t.id === overId);

      let targetTasks = [...activeCol.tasks];
      let finalIndex = taskIndex;

      if (activeColIndex === overColIndex) {
        if (overTaskIndex !== -1 && taskIndex !== overTaskIndex) {
          finalIndex = overTaskIndex;
          targetTasks = arrayMove(activeCol.tasks, taskIndex, overTaskIndex);
        } else if (overId === overCol.id && taskIndex !== activeCol.tasks.length - 1) {
          finalIndex = activeCol.tasks.length - 1;
          targetTasks = arrayMove(activeCol.tasks, taskIndex, finalIndex);
        }
      }

      let newOrder = 0;
      const prevTask: any = targetTasks[finalIndex - 1];
      const nextTask: any = targetTasks[finalIndex + 1];

      if (prevTask && nextTask) newOrder = (prevTask.order + nextTask.order) / 2.0;
      else if (prevTask) newOrder = prevTask.order + 1.0;
      else if (nextTask) newOrder = nextTask.order / 2.0;
      else newOrder = 1.0;

      setColumns((prev: any[]) => {
        const newCols = [...prev];
        newCols[activeColIndex].tasks = targetTasks;
        newCols[activeColIndex].tasks[finalIndex] = { ...task, order: newOrder };
        return newCols;
      });

      updateTaskPosition.mutate({ taskId: activeId, columnId: activeCol.id, order: newOrder });
    }
  };

  const handleAddColumn = () => {
    const title = window.prompt('Nome da nova etapa:');
    if (title) createColumnMutation.mutate(title);
  };

  const dropAnimation = { sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }) };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex gap-6 h-full pb-4 items-start pt-2">
        <SortableContext items={columns.map((c: any) => c.id)} strategy={horizontalListSortingStrategy}>
          {columns.map((col: any) => (
            <Column key={col.id} column={col} tasks={col.tasks} isRestricted={isRestricted} userId={userId as string} />
          ))}
        </SortableContext>

        {!isRestricted && (
          <div className="w-80 shrink-0">
            {/* 🔥 IDENTIDADE: O Botão Tracejado Burgundy */}
            <button onClick={handleAddColumn} disabled={createColumnMutation.isPending} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#7A1D22]/40 rounded-2xl text-[#7A1D22] hover:bg-[#7A1D22]/5 transition-all font-semibold shadow-sm bg-transparent">
              {createColumnMutation.isPending ? 'Criando...' : '+ Criar Nova Lista'}
            </button>
          </div>
        )}
      </div>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? <TaskCard task={activeTask} isRestricted={isRestricted} userId={userId as string} isOverlay /> : null}
        {activeColumn ? <Column column={activeColumn} tasks={activeColumn.tasks} isRestricted={isRestricted} userId={userId as string} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

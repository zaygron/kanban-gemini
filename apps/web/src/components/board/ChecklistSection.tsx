import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckSquare, Trash2, Plus, GripVertical, X } from 'lucide-react';

export function ChecklistSection({ task, canEdit }: { task: any, canEdit: boolean }) {
    const queryClient = useQueryClient();
    const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});

    const deleteChecklist = useMutation({
        mutationFn: async (id: string) => await api.delete(`/kanban/checklists/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board'] })
    });

    const addItem = useMutation({
        mutationFn: async ({ checklistId, title }: { checklistId: string, title: string }) =>
            await api.post(`/kanban/checklists/${checklistId}/items`, { title }),
        onSuccess: (_, variables) => {
            setNewItemTitles(prev => ({ ...prev, [variables.checklistId]: '' }));
            queryClient.invalidateQueries({ queryKey: ['board'] });
        }
    });

    const toggleItem = useMutation({
        mutationFn: async ({ itemId, isCompleted }: { itemId: string, isCompleted: boolean }) =>
            await api.patch(`/kanban/checklist-items/${itemId}`, { isCompleted }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board'] })
    });

    const deleteItem = useMutation({
        mutationFn: async (itemId: string) => await api.delete(`/kanban/checklist-items/${itemId}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board'] })
    });

    if (!task.checklists || task.checklists.length === 0) return null;

    return (
        <div className="space-y-6 pt-4">
            {task.checklists.map((checklist: any) => {
                const totalItems = checklist.items?.length || 0;
                const completedItems = checklist.items?.filter((i: any) => i.isCompleted).length || 0;
                const progress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

                return (
                    <div key={checklist.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckSquare size={18} className="text-slate-600" />
                                <h3 className="font-bold text-slate-800 text-base">{checklist.title}</h3>
                            </div>
                            {canEdit && (
                                <button
                                    onClick={() => { if (window.confirm('Excluir este checklist?')) deleteChecklist.mutate(checklist.id) }}
                                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                >
                                    Excluir
                                </button>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-500 w-8">{progress}%</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-1 mt-3">
                            {checklist.items?.map((item: any) => (
                                <div key={item.id} className="group flex items-start gap-3 p-1.5 hover:bg-slate-50 rounded-lg pr-2 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={item.isCompleted}
                                        disabled={!canEdit || toggleItem.isPending}
                                        onChange={(e) => toggleItem.mutate({ itemId: item.id, isCompleted: e.target.checked })}
                                        className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <div className={`flex-1 text-sm pt-0.5 ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                        {item.title}
                                    </div>
                                    {canEdit && (
                                        <button
                                            onClick={() => deleteItem.mutate(item.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-all"
                                            title="Excluir item"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add Item Input */}
                        {canEdit && (
                            <div className="pl-7 mt-2">
                                <input
                                    type="text"
                                    placeholder="Adicionar um item..."
                                    value={newItemTitles[checklist.id] || ''}
                                    onChange={(e) => setNewItemTitles(prev => ({ ...prev, [checklist.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newItemTitles[checklist.id]?.trim()) {
                                            e.preventDefault();
                                            addItem.mutate({ checklistId: checklist.id, title: newItemTitles[checklist.id].trim() });
                                        }
                                    }}
                                    className="w-full text-sm border-none bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-md px-3 py-2 transition-colors placeholder:text-slate-400"
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

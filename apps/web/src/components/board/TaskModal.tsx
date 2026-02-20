import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { X, Calendar, AlignLeft, Flag, User, ShieldAlert, Archive, Trash2, RotateCcw } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export function TaskModal({ task, canEdit, onClose }: { task: any, canEdit: boolean, onClose: () => void }) {
  const queryClient = useQueryClient();
  const params = useParams();
  const boardId = params?.id as string;
  const { data } = useQuery({ queryKey: ['boardMembers', boardId], enabled: !!boardId });
  const membersData = data as any;

  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'MEDIUM');
  const [assignedTo, setAssignedTo] = useState(task.assignedTo || '');
  const formatDateForInput = (dateStr: string) => { if (!dateStr) return ''; try { return new Date(dateStr).toISOString().split('T')[0]; } catch { return ''; } };
  const [startDate, setStartDate] = useState(formatDateForInput(task.startDate));
  const [dueDate, setDueDate] = useState(formatDateForInput(task.dueDate));
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const updateMutation = useMutation({
    mutationFn: async () => { await api.patch(`/kanban/tasks/${task.id}`, { description, priority, assignedTo: assignedTo || null, startDate: startDate || null, dueDate: dueDate || null }); },
    onSuccess: () => { toast.success('Salvo com sucesso!'); queryClient.invalidateQueries({ queryKey: ['board'] }); onClose(); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao salvar.')
  });

  const archiveMutation = useMutation({
    mutationFn: async () => await api.post(`/kanban/tasks/${task.id}/archive`, {}),
    onSuccess: () => { toast.success('Tarefa arquivada'); queryClient.invalidateQueries({ queryKey: ['board'] }); onClose(); }
  });

  const restoreMutation = useMutation({
    mutationFn: async () => await api.post(`/kanban/tasks/${task.id}/restore`, {}),
    onSuccess: () => { toast.success('Tarefa restaurada'); queryClient.invalidateQueries({ queryKey: ['board'] }); onClose(); }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => await api.delete(`/kanban/tasks/${task.id}`),
    onSuccess: () => { toast.success('Tarefa excluída permanentemente'); queryClient.invalidateQueries({ queryKey: ['board'] }); onClose(); }
  });


  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

  const { data: activityLogs, isLoading: activityLoading } = useQuery({
    queryKey: ['taskActivity', task.id],
    queryFn: async () => (await api.get(`/kanban/tasks/${task.id}/activity`)).data,
    enabled: activeTab === 'activity'
  });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 break-words leading-snug">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors shrink-0"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-6 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Atividade
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">

          {activeTab === 'details' ? (
            <div className="space-y-8">
              {!canEdit && (
                <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-xl text-sm font-medium flex gap-3">
                  <ShieldAlert size={20} className="shrink-0 text-orange-500 mt-0.5" />
                  Modo Somente Leitura! Você está acessando como Operador Restrito. Apenas o Responsável designado ou o Admin do projeto podem alterar os dados desta tarefa.
                </div>
              )}

              {task.archivedAt && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-sm font-medium flex gap-3">
                  <Archive size={20} className="shrink-0 text-amber-600 mt-0.5" />
                  Esta tarefa está arquivada. Restaure-a para editar ou movê-la.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><User size={16} className="text-indigo-500" /> Responsável</label>
                  <select disabled={!canEdit} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none bg-slate-50 text-slate-700 disabled:opacity-70 disabled:cursor-not-allowed font-medium">
                    <option value="">👤 Ninguém atribuído</option>
                    {membersData?.owner && <option value={membersData.owner.id}>👑 {membersData.owner.name} (Admin)</option>}
                    {membersData?.members?.map((m: any) => <option key={m.id} value={m.id}>✔️ {m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Flag size={16} className="text-blue-500" /> Prioridade</label>
                  <select disabled={!canEdit} value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed text-slate-700 font-medium">
                    <option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta 🔥</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Calendar size={16} className="text-emerald-500" /> Início</label>
                  <input disabled={!canEdit} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 disabled:opacity-70 text-slate-700 font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Calendar size={16} className="text-red-500" /> Prazo Final</label>
                  <input disabled={!canEdit} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 disabled:opacity-70 text-slate-700 font-medium" />
                </div>
              </div>
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><AlignLeft size={16} className="text-purple-500" /> Descrição Detalhada</label>
                <textarea disabled={!canEdit} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[150px] resize-y bg-slate-50 disabled:opacity-70 text-slate-700" />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {activityLoading ? (
                <div className="text-center py-8 text-slate-500">Carregando histórico...</div>
              ) : activityLogs?.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Nenhuma atividade registrada.</div>
              ) : (
                <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 py-2">
                  {activityLogs.map((log: any) => (
                    <div key={log.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 bg-blue-100 rounded-full border-2 border-white shadow-sm ring-1 ring-blue-500"></div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span className="font-bold text-slate-700">{log.actor}</span>
                          <span>•</span>
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-600 whitespace-pre-line">
                          {log.details.changes.map((change: string, idx: number) => (
                            <div key={idx}>{change}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">{canEdit ? 'Cancelar' : 'Fechar Visão'}</button>
          {canEdit && (
            <>
              {task.archivedAt ? (
                <>
                  <button onClick={() => { if (window.confirm('Tem certeza que deseja excluir permanentemente?')) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md flex items-center gap-2">
                    <Trash2 size={16} /> Excluir
                  </button>
                  <button onClick={() => restoreMutation.mutate()} disabled={restoreMutation.isPending} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md flex items-center gap-2">
                    <RotateCcw size={16} /> Restaurar
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending} className="px-5 py-2.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors flex items-center gap-2">
                    <Archive size={16} /> Arquivar
                  </button>
                  <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-50">
                    {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

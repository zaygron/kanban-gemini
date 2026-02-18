import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Mail, ShieldAlert, Trash2, Shield, HardHat } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export function ShareModal({ boardId, onClose, isOwner }: { boardId: string, onClose: () => void, isOwner: boolean }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  
  // 🔥 O ESTADO QUE GUARDA O CARGO SELECIONADO:
  const [role, setRole] = useState('MEMBER');
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['boardMembers', boardId],
    queryFn: async () => (await api.get(`/kanban/board/${boardId}/members`)).data
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/kanban/board/${boardId}/members`, { email: email.trim(), role });
      return data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || 'Convite enviado!');
      setEmail('');
      setRole('MEMBER'); // Reseta para o padrão após sucesso
      queryClient.invalidateQueries({ queryKey: ['boardMembers', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao enviar o convite.')
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => await api.delete(`/kanban/board/${boardId}/members/${memberId}`),
    onSuccess: () => {
      toast.success('Membro removido!');
      queryClient.invalidateQueries({ queryKey: ['boardMembers', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    }
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) inviteMutation.mutate();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserPlus size={20} className="text-blue-600"/> Equipe do Quadro</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 🔥 O NOVO FORMULÁRIO COM O SELETOR DE CARGOS */}
          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-4 bg-blue-50/40 p-5 border border-blue-100 rounded-xl shadow-sm">
              <h3 className="text-sm font-bold text-slate-700">Adicionar Novo Membro</h3>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Mail size={16} /></div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail do convidado..." className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white" required />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <select value={role} onChange={(e) => setRole(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none bg-white cursor-pointer font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all">
                  <option value="MEMBER">⚡ Colaborador Total</option>
                  <option value="RESTRICTED">👷 Operador Restrito</option>
                </select>
                <button type="submit" disabled={inviteMutation.isPending || !email} className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shrink-0">
                  {inviteMutation.isPending ? 'Enviando...' : 'Convidar'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Membros com Acesso</h3>
            {isLoading ? <div className="text-sm text-slate-500 text-center py-4">Carregando...</div> : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                <div className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">{data?.owner?.name?.substring(0, 2)}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-none">{data?.owner?.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{data?.owner?.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded uppercase flex items-center gap-1"><ShieldAlert size={10} /> Admin</span>
                </div>

                {data?.members?.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-lg group hover:border-blue-200 transition-colors shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${m.role === 'MEMBER' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{m.name?.substring(0, 2)}</div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-none flex items-center gap-1">
                          {m.name}
                          {/* As etiquetas corporativas na lista */}
                          {m.role === 'RESTRICTED' ? <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded uppercase ml-1 flex items-center gap-1"><HardHat size={10}/> Restrito</span> : <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded uppercase ml-1 flex items-center gap-1"><Shield size={10}/> Total</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{m.email}</p>
                      </div>
                    </div>
                    {isOwner && (
                      <button onClick={() => { if (confirm(`Remover ${m.name}?`)) removeMutation.mutate(m.memberId); }} className="text-slate-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

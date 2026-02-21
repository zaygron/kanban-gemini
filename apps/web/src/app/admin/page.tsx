'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Shield, UserPlus, Users, ArrowLeft, Mail, Lock, Unlock, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'ADMIN' | 'COMMON'>('COMMON');

    const { data: user, isLoading: userLoading, isError } = useQuery({
        queryKey: ['me'],
        queryFn: async () => (await api.get('/me')).data.user,
        retry: false
    });

    useEffect(() => {
        if (!userLoading && user) {
            if (user.role !== 'MASTER' && user.role !== 'ADMIN') {
                toast.error('Acesso negado: Você não é administrador.');
                router.replace('/');
            }
        } else if (isError) {
            router.replace('/login');
        }
    }, [user, userLoading, isError, router]);

    const inviteMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.post('/auth/invite', { email, name, role });
            return data;
        },
        onSuccess: (data: any) => {
            toast.success(`Convite enviado! Senha temporária: ${data.tempPassword}`);
            setEmail('');
            setName('');
            setRole('COMMON');
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao enviar convite.')
    });

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !name) return;
        inviteMutation.mutate();
    };

    const usersQuery = useQuery({
        queryKey: ['users'],
        queryFn: async () => (await api.get('/users')).data,
        enabled: !!user && (user.role === 'MASTER' || user.role === 'ADMIN')
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, role }: { id: string, role: string }) => await api.patch(`/users/${id}/role`, { role }),
        onSuccess: () => {
            toast.success('Cargo atualizado!');
            usersQuery.refetch();
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao atualizar cargo.')
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/users/${id}`),
        onSuccess: (res: any) => {
            toast.success(res?.data?.message || 'Status do usuário alterado.');
            usersQuery.refetch();
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao alterar status do usuário.')
    });

    const resendInviteMutation = useMutation({
        mutationFn: async (id: string) => await api.post('/auth/resend-invite', { userId: id }),
        onSuccess: (res: any) => {
            toast.success(res?.data?.message || 'Convite reenviado!');
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao reenviar convite.')
    });

    const handleRoleChange = (id: string, role: string) => {
        if (confirm('Tem certeza que deseja alterar o cargo deste usuário?')) {
            updateRoleMutation.mutate({ id, role });
        }
    };

    const handleToggleActive = (id: string, isActive: boolean) => {
        const action = isActive ? 'INATIVAR' : 'REATIVAR';
        if (confirm(`ATENÇÃO: Deseja realmente ${action} este usuário?`)) {
            toggleActiveMutation.mutate(id);
        }
    };

    const handleResendInvite = (id: string) => {
        if (confirm('Deseja gerar uma nova senha temporária e reenviar o e-mail de convite para este usuário?')) {
            resendInviteMutation.mutate(id);
        }
    };

    if (userLoading || !user) return <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando...</div>;

    const canInviteAdmin = user.role === 'MASTER';

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
                <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 transition-colors"><ArrowLeft size={20} /></button>
                <div className="flex items-center gap-2 text-violet-600">
                    <Shield size={24} />
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Painel Administrativo</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 mt-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                        <div className="bg-violet-100 p-3 rounded-full text-violet-600"><UserPlus size={24} /></div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Convidar Novo Usuário</h2>
                            <p className="text-sm text-slate-500">Envie um convite por e-mail para adicionar alguém ao sistema.</p>
                        </div>
                    </div>

                    <form onSubmit={handleInvite} className="flex flex-col gap-5 max-w-lg">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome Completo</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">E-mail Corporativo</label>
                            <div className="relative">
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@empresa.com" className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none transition-all" />
                                <Mail size={18} className="absolute left-3 top-3 text-slate-400" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Cargo / Permissão</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${role === 'COMMON' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <input type="radio" name="role" value="COMMON" checked={role === 'COMMON'} onChange={() => setRole('COMMON')} className="accent-violet-600 w-4 h-4" />
                                    <div>
                                        <span className="block font-bold text-sm">Comum</span>
                                        <span className="block text-xs opacity-70">Pode acessar quadros e criar tarefas.</span>
                                    </div>
                                </label>

                                {canInviteAdmin && (
                                    <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${role === 'ADMIN' ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input type="radio" name="role" value="ADMIN" checked={role === 'ADMIN'} onChange={() => setRole('ADMIN')} className="accent-violet-600 w-4 h-4" />
                                        <div>
                                            <span className="block font-bold text-sm">Admin</span>
                                            <span className="block text-xs opacity-70">Pode convidar outros usuários.</span>
                                        </div>
                                    </label>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={inviteMutation.isPending || !email || !name} className="mt-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-6 rounded-xl shadow-md shadow-violet-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {inviteMutation.isPending ? 'Enviando...' : 'Enviar Convite'}
                        </button>
                    </form>
                </div>

                {/* Lista de Usuários */}
                <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Users size={24} /></div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Usuários do Sistema</h2>
                                <p className="text-sm text-slate-500">Gerencie quem tem acesso à plataforma.</p>
                            </div>
                        </div>
                        <button onClick={() => usersQuery.refetch()} className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50" title="Atualizar Lista">
                            <Users size={20} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                                    <th className="px-8 py-4">Usuário</th>
                                    <th className="px-6 py-4">Cargo</th>
                                    <th className="px-6 py-4">Entrou em</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {usersQuery.isLoading ? (
                                    <tr><td colSpan={4} className="px-8 py-8 text-center text-slate-500">Carregando usuários...</td></tr>
                                ) : usersQuery.isError ? (
                                    <tr><td colSpan={4} className="px-8 py-8 text-center text-red-500">Erro ao carregar usuários.</td></tr>
                                ) : usersQuery.data?.users.map((u: any) => (
                                    <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors group ${!u.isActive ? 'opacity-60 saturate-50' : ''}`}>
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${u.isActive ? 'bg-slate-200 text-slate-600' : 'bg-red-100 text-red-600'}`}>
                                                    {u.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                                                        {u.name}
                                                        {!u.isActive && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Inativo</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={u.role}
                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                disabled={u.id === user.id || (user.role === 'ADMIN' && u.role === 'MASTER') || !u.isActive}
                                                className={`text-xs font-bold px-2 py-1 rounded-md border-0 bg-transparent cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 transition-all ${!u.isActive ? 'cursor-not-allowed opacity-70' : ''} ${u.role === 'MASTER' ? 'text-violet-700 bg-violet-50' :
                                                    u.role === 'ADMIN' ? 'text-blue-700 bg-blue-50' : 'text-slate-600 bg-slate-100'
                                                    }`}
                                            >
                                                <option value="COMMON">Comum</option>
                                                <option value="ADMIN">Admin</option>
                                                {user.role === 'MASTER' && <option value="MASTER">Master</option>}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 flex items-center justify-end gap-3 h-full pt-6">
                                            <button
                                                onClick={() => handleResendInvite(u.id)}
                                                disabled={!u.isActive || resendInviteMutation.isPending}
                                                className="text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Reenviar Convite e Gerar Nova Senha"
                                            >
                                                <Send size={18} />
                                            </button>

                                            <button
                                                onClick={() => handleToggleActive(u.id, u.isActive)}
                                                disabled={user.role !== 'MASTER' || u.id === user.id}
                                                className={`transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${u.isActive ? 'text-slate-400 hover:text-red-500' : 'text-red-500 hover:text-green-600'}`}
                                                title={user.role !== 'MASTER' ? "Apenas Masters podem alterar status" : u.isActive ? "Inativar Usuário" : "Reativar Usuário"}
                                            >
                                                {u.isActive ? <Lock size={18} /> : <Unlock size={18} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

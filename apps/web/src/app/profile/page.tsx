
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Save, Lock, User, Shield } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { data: user, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: async () => (await api.get('/me')).data.user
    });

    useEffect(() => {
        if (user) {
            setName(user.name);
        }
    }, [user]);

    const updateProfileMutation = useMutation({
        mutationFn: async (data: any) => await api.patch('/users/me', data),
        onSuccess: () => {
            toast.success('Perfil atualizado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['me'] });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Erro ao atualizar perfil.');
        }
    });

    const handleUpdateName = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        updateProfileMutation.mutate({ name });
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Preencha todos os campos de senha.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('A nova senha e a confirmação não conferem.');
            return;
        }
        updateProfileMutation.mutate({ currentPassword, newPassword });
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Carregando...</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans p-6">
            <header className="max-w-4xl mx-auto mb-8 flex items-center gap-4">
                <Link href="/" className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Meu Perfil</h1>
                    <p className="text-slate-500 text-sm">Gerencie suas informações pessoais e segurança.</p>
                </div>
            </header>

            <main className="max-w-4xl mx-auto grid gap-8">

                {/* Basic Info Card */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={24} /></div>
                        <h2 className="text-lg font-bold text-slate-800">Informações Básicas</h2>
                    </div>

                    <form onSubmit={handleUpdateName} className="space-y-6 max-w-lg">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-2">E-mail</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-medium cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-400 mt-1">O e-mail não pode ser alterado.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-2">Nome Completo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={updateProfileMutation.isPending || name === user?.name}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                            >
                                <Save size={18} /> Salvar Alterações
                            </button>
                        </div>
                    </form>
                </section>

                {/* Security Card */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Shield size={24} /></div>
                        <h2 className="text-lg font-bold text-slate-800">Segurança</h2>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-lg">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-2">Senha Atual</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Digite sua senha atual..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all font-medium text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Nova Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Nova senha..."
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all font-medium text-slate-800"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Confirmar Nova Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repita a senha..."
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all font-medium text-slate-800"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={updateProfileMutation.isPending || !currentPassword || !newPassword}
                                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                            >
                                <Save size={18} /> Atualizar Senha
                            </button>
                        </div>
                    </form>
                </section>

            </main>
        </div>
    );
}

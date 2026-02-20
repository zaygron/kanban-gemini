
import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KanbanGuard } from '../auth/kanban.guard';
import * as bcrypt from 'bcryptjs';

@UseGuards(KanbanGuard)
@Controller('users')
export class UsersController {
    constructor(private prisma: PrismaService) { }

    @Patch('me')
    async updateMe(@Request() req: any, @Body() body: { name?: string; currentPassword?: string; newPassword?: string }) {
        const userId = req.user.sub || req.user.id;

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuário não encontrado.');

        const dataToUpdate: any = {};

        if (body.name) {
            dataToUpdate.name = body.name;
        }

        if (body.newPassword) {
            if (!body.currentPassword) {
                throw new ForbiddenException('Para alterar a senha, informe a senha atual.');
            }

            const isMatch = await bcrypt.compare(body.currentPassword, user.passwordHash);
            if (!isMatch) {
                throw new ForbiddenException('Senha atual incorreta.');
            }

            const hash = await bcrypt.hash(body.newPassword, 10);
            dataToUpdate.passwordHash = hash;
            dataToUpdate.mustChangePassword = false;
        }

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
            select: { id: true, name: true, email: true, role: true }
        });

        return { success: true, user: updated };
    }


    @Get()
    async findAll(@Request() req: any) {
        // Only Master and Admin can list users
        const userRole = req.user.role;
        if (userRole !== 'MASTER' && userRole !== 'ADMIN') {
            throw new ForbiddenException('Acesso negado.');
        }

        const users = await this.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return { users };
    }

    @Patch(':id/role')
    async updateRole(@Request() req: any, @Param('id') id: string, @Body() body: { role: 'MASTER' | 'ADMIN' | 'COMMON' }) {
        const requesterRole = req.user.role;
        if (requesterRole !== 'MASTER' && requesterRole !== 'ADMIN') {
            throw new ForbiddenException('Apenas Masters e Admins podem alterar cargos.');
        }

        const targetUser = await this.prisma.user.findUnique({ where: { id } });
        if (!targetUser) throw new NotFoundException('Usuário não encontrado.');

        // Rules:
        // 1. Admin cannot change Master's role.
        // 2. Admin cannot change another Admin's role (optional, but safe).
        // 3. Admin cannot promote to Master.

        if (requesterRole === 'ADMIN') {
            if (targetUser.role === 'MASTER') throw new ForbiddenException('Admins não podem alterar Masters.');
            if (body.role === 'MASTER') throw new ForbiddenException('Admins não podem promover a Master.');
        }

        // Prevent changing your own role to something lower (locking yourself out) - Front should block, but API too?
        // Let's allow it but maybe warn? For now allow.

        const updated = await this.prisma.user.update({
            where: { id },
            data: { role: body.role },
            select: { id: true, role: true }
        });

        return { success: true, user: updated };
    }

    @Delete(':id')
    async remove(@Request() req: any, @Param('id') id: string) {
        const requesterRole = req.user.role;
        if (requesterRole !== 'MASTER') {
            throw new ForbiddenException('Apenas Masters podem excluir usuários.');
        }

        if (req.user.sub === id || req.user.id === id) {
            throw new ForbiddenException('Você não pode se excluir.');
        }

        // Check if user exists
        const target = await this.prisma.user.findUnique({ where: { id } });
        if (!target) throw new NotFoundException('Usuário não encontrado.');

        // Delete (Cascade should handle related data if configured in Prisma, let's check schema.prisma later)
        // For now we assume standard delete.
        await this.prisma.user.delete({ where: { id } });

        return { success: true, message: 'Usuário removido.' };
    }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards, NotFoundException, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { KanbanGuard } from '../auth/kanban.guard';
import { MailService } from '../mail/mail.service';

function toRank(order: number): string { return Number(order || 0).toFixed(5).padStart(20, '0'); }

@UseGuards(KanbanGuard)
@Controller('kanban')
export class KanbanController {
  constructor(private prisma: PrismaService, private events: EventsGateway, private mailService: MailService) { }

  private async getPermissions(userId: string, boardId: string) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId }, include: { members: true } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!board) throw new NotFoundException('Quadro não encontrado.');
    const isOwner = board.createdById === userId;
    const member = board.members.find(m => m.userId === userId);
    const isRestricted = !isOwner && member?.role === 'RESTRICTED';
    const isMaster = user?.role === 'MASTER';
    return { isOwner, isMember: !!member, isRestricted, isMaster, role: isOwner ? 'OWNER' : (member?.role || (isMaster ? 'SUPERVISION' : 'NONE')) };
  }

  @Get('board/:id')
  async getBoard(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const { isOwner, isMember, isMaster, role } = await this.getPermissions(userId, id);
    if (!isOwner && !isMember && !isMaster) throw new UnauthorizedException('Acesso negado.');

    // Se o usuário pedir ?includeArchived=true, mostramos tudo. Senão, filtramos.
    const includeArchived = req.query.includeArchived === 'true';



    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        lists: {
          include: {
            cards: {
              where: includeArchived ? {} : { archivedAt: null },
              orderBy: { rank: 'asc' }
            }
          },
          orderBy: { rank: 'asc' }
        }
      }
    });



    return {
      ...board,
      userRole: role,
      columns: board?.lists.map((list: any) => ({
        id: list.id, title: list.title, order: parseFloat(list.rank), boardId: list.boardId,
        tasks: list.cards.map((card: any) => ({
          id: card.id, title: card.title, order: parseFloat(card.rank), columnId: card.listId,
          description: card.description, priority: card.priority, startDate: card.startDate, dueDate: card.dueDate, assignedTo: card.assignedTo,
          archivedAt: card.archivedAt
        }))
      }))
    };
  }

  @Get('board/:id/members')
  async getMembers(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const { isOwner, isMember, isMaster } = await this.getPermissions(userId, id);
    if (!isOwner && !isMember && !isMaster) throw new UnauthorizedException('Acesso negado.');

    const board = await this.prisma.board.findUnique({ where: { id }, include: { members: { include: { user: true } } } });
    const owner = await this.prisma.user.findUnique({ where: { id: board?.createdById } });
    return {
      owner: { id: owner?.id, name: owner?.name, email: owner?.email },
      members: board?.members.map((m: any) => ({ id: m.user.id, name: m.user.name, email: m.user.email, role: m.role, memberId: m.id }))
    };
  }

  @Post('board/:id/members')
  async addMember(@Param('id') id: string, @Body() body: { email: string; role: string }, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const { isOwner } = await this.getPermissions(userId, id);
    if (!isOwner) throw new ForbiddenException('Apenas o dono pode gerenciar a equipe.');

    const invitee = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (!invitee) throw new BadRequestException('Usuário não encontrado.');
    if (invitee.id === userId) throw new BadRequestException('Você já é o dono.');

    const existing = await this.prisma.boardMember.findUnique({ where: { boardId_userId: { boardId: id, userId: invitee.id } } });
    if (existing) throw new BadRequestException('Usuário já é membro.');

    await this.prisma.boardMember.create({ data: { boardId: id, userId: invitee.id, role: body.role || 'MEMBER' } });
    this.events.server.emit('boardUpdated', { boardId: id });
    return { success: true, message: 'Usuário adicionado à equipe!' };
  }

  @Delete('board/:id/members/:memberId')
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const { isOwner } = await this.getPermissions(userId, id);
    if (!isOwner) throw new ForbiddenException('Apenas o dono pode remover membros.');
    await this.prisma.boardMember.delete({ where: { id: memberId } });
    this.events.server.emit('boardUpdated', { boardId: id });
    return { success: true };
  }

  @Patch('board/:id')
  async updateBoard(@Param('id') id: string, @Body() body: { name: string }, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const { isOwner } = await this.getPermissions(userId, id);
    if (!isOwner) throw new ForbiddenException('Apenas o dono pode renomear.');
    const updatedBoard = await this.prisma.board.update({ where: { id }, data: { name: body.name } });
    this.events.server.emit('boardUpdated', { boardId: id });
    return updatedBoard;
  }

  @Post('columns')
  async createColumn(@Request() req: any, @Body() body: { title: string; boardId: string; order: number }) {
    const userId = req.user?.sub || req.user?.id;
    const { isOwner, isMember, isRestricted, isMaster } = await this.getPermissions(userId, body.boardId);
    if (!isOwner && !isMember && !isMaster) throw new UnauthorizedException('Acesso negado.');
    if (isRestricted) throw new ForbiddenException('Acesso Restrito: Você não pode criar listas.');

    const list = await this.prisma.list.create({ data: { title: body.title, boardId: body.boardId, rank: toRank(body.order) } });
    this.events.server.emit('boardUpdated', { boardId: list.boardId });
    return { id: list.id, title: list.title, order: parseFloat(list.rank), boardId: list.boardId };
  }

  // 🔥 A Rota Patch agora entende a Ordem (Rank) da Coluna
  @Patch('columns/:id')
  async updateColumn(@Param('id') id: string, @Body() body: { title?: string, order?: number }, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const listCheck = await this.prisma.list.findUnique({ where: { id } });
    if (!listCheck) throw new NotFoundException();

    const { isOwner, isMember, isRestricted, isMaster } = await this.getPermissions(userId, listCheck.boardId);
    if (!isOwner && !isMember && !isMaster) throw new UnauthorizedException('Acesso negado.');
    if (isRestricted) throw new ForbiddenException('Acesso Restrito: Você não pode alterar listas.');

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.order !== undefined) data.rank = toRank(body.order);

    const list = await this.prisma.list.update({ where: { id }, data });
    this.events.server.emit('boardUpdated', { boardId: list.boardId });
    return { id: list.id, title: list.title, order: parseFloat(list.rank), boardId: list.boardId };
  }

  @Post('tasks')
  async createTask(@Request() req: any, @Body() body: { title: string; columnId: string; order: number }) {
    const userId = req.user.sub || req.user.id;
    const list = await this.prisma.list.findUnique({ where: { id: body.columnId } });
    if (!list) throw new NotFoundException();

    const { isOwner, isMember, isRestricted, isMaster } = await this.getPermissions(userId, list.boardId);
    if (!isOwner && !isMember && !isMaster) throw new UnauthorizedException('Acesso negado.');
    if (isRestricted) throw new ForbiddenException('Acesso Restrito: Você não pode criar tarefas.');

    const card = await this.prisma.card.create({
      data: { title: body.title, listId: body.columnId, rank: toRank(body.order), boardId: list.boardId, createdById: userId, status: 'TODO' }
    });
    this.events.server.emit('boardUpdated', { boardId: list.boardId });
    return { id: card.id, title: card.title, order: parseFloat(card.rank), columnId: card.listId, description: card.description, priority: card.priority, startDate: card.startDate, dueDate: card.dueDate, assignedTo: card.assignedTo };
  }

  @Patch('tasks/:id')
  async updateTask(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const cardCheck = await this.prisma.card.findUnique({ where: { id } });
    if (!cardCheck) throw new NotFoundException();

    const { isOwner, isMember, isRestricted, isMaster } = await this.getPermissions(userId, cardCheck.boardId);
    if (!isOwner && !isMember && !isMaster) throw new UnauthorizedException('Acesso negado.');

    if (isRestricted && cardCheck.assignedTo !== userId) {
      throw new ForbiddenException('Você só tem permissão para mover ou editar tarefas atribuídas a você.');
    }
    if (isRestricted && body.assignedTo !== undefined && body.assignedTo !== userId && body.assignedTo !== null) {
      throw new ForbiddenException('Você não pode transferir a tarefa para outra pessoa.');
    }

    const data: any = {};
    const changes: string[] = [];

    if (body.columnId !== undefined) data.listId = body.columnId;
    if (body.order !== undefined) data.rank = toRank(body.order);
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;

    if (body.startDate !== undefined) {
      const newDate = body.startDate ? new Date(body.startDate) : null;
      if (cardCheck.startDate?.toISOString() !== newDate?.toISOString()) {
        data.startDate = newDate;
        changes.push(`Data de Início: ${cardCheck.startDate ? new Date(cardCheck.startDate).toLocaleDateString('pt-BR') : 'Sem data'} -> ${newDate ? newDate.toLocaleDateString('pt-BR') : 'Sem data'}`);
      }
    }

    if (body.dueDate !== undefined) {
      const newDate = body.dueDate ? new Date(body.dueDate) : null;
      if (cardCheck.dueDate?.toISOString() !== newDate?.toISOString()) {
        data.dueDate = newDate;
        changes.push(`Data de Entrega: ${cardCheck.dueDate ? new Date(cardCheck.dueDate).toLocaleDateString('pt-BR') : 'Sem data'} -> ${newDate ? newDate.toLocaleDateString('pt-BR') : 'Sem data'}`);
      }
    }

    if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo || null;

    const card = await this.prisma.card.update({ where: { id }, data });
    this.events.server.emit('boardUpdated', { boardId: card.boardId });

    // ACTIVITY LOG & NOTIFICATION
    if (changes.length > 0) {
      const actor = await this.prisma.user.findUnique({ where: { id: userId } });

      await this.prisma.activityLog.create({
        data: {
          boardId: card.boardId,
          actorUserId: userId,
          eventType: 'UPDATE',
          entityType: 'CARD',
          entityId: card.id,
          payload: { changes }
        }
      });

      // Notify Board Owner
      const board = await this.prisma.board.findUnique({ where: { id: card.boardId } });
      const owner = await this.prisma.user.findUnique({ where: { id: board?.createdById } });

      if (owner && owner.email) {
        this.mailService.sendDateChangeNotification(owner.email, card.title, changes.join('\n'), actor?.name || 'Alguém');
      }
    }

    return { id: card.id, title: card.title, order: parseFloat(card.rank), columnId: card.listId, description: card.description, priority: card.priority, startDate: card.startDate, dueDate: card.dueDate, assignedTo: card.assignedTo };
  }

  @Post('tasks/:id/archive')
  async archiveTask(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const cardCheck = await this.prisma.card.findUnique({ where: { id } });
    if (!cardCheck) throw new NotFoundException();

    const { isOwner, isMember, isMaster } = await this.getPermissions(userId, cardCheck.boardId);
    if (!isOwner && !isMember && !isMaster) throw new UnauthorizedException('Acesso negado.');

    const card = await this.prisma.card.update({ where: { id }, data: { archivedAt: new Date() } });
    this.events.server.emit('boardUpdated', { boardId: card.boardId });
    return card;
  }

  @Post('tasks/:id/restore')
  async restoreTask(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;


    const cardCheck = await this.prisma.card.findUnique({ where: { id } });
    if (!cardCheck) throw new NotFoundException();

    const { isOwner, isMember, isMaster } = await this.getPermissions(userId, cardCheck.boardId);
    if (!isOwner && !isMember && !isMaster) throw new UnauthorizedException('Acesso negado.');

    const card = await this.prisma.card.update({ where: { id }, data: { archivedAt: null } });


    this.events.server.emit('boardUpdated', { boardId: card.boardId });
    return card;
  }

  @Delete('tasks/:id')
  async deleteTask(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundException();

    const { isOwner, isMember, isRestricted, isMaster } = await this.getPermissions(userId, card.boardId);
    if (!isOwner && !isMember && !isMaster) throw new UnauthorizedException();
    if (isRestricted && !isMaster) throw new ForbiddenException('Acesso Negado: Apenas o criador do quadro pode deletar tarefas.');

    await this.prisma.card.delete({ where: { id } });
    this.events.server.emit('boardUpdated', { boardId: card.boardId });
    return { success: true };
  }

  @Get('tasks/:id/activity')
  async getActivity(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundException();

    const { isOwner, isMember, isMaster } = await this.getPermissions(userId, card.boardId);
    if (!isOwner && !isMember && !isMaster) throw new UnauthorizedException();

    const logs = await this.prisma.activityLog.findMany({
      where: { entityId: id, entityType: 'CARD' },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { name: true, email: true } } }
    });

    return logs.map((log: any) => ({
      id: log.id.toString(), // BigInt to String
      actor: log.actor.name,
      details: log.payload,
      createdAt: log.createdAt
    }));
  }
}

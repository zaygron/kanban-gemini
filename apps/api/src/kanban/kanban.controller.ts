import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { KanbanGuard } from '../auth/kanban.guard';

function toRank(order: number): string {
  return Number(order || 0).toFixed(5).padStart(20, '0');
}

// 🔐 TODA A API AGORA ESTÁ 100% BLINDADA E PROTEGIDA!
@UseGuards(KanbanGuard)
@Controller('kanban')
export class KanbanController {
  constructor(private prisma: PrismaService, private events: EventsGateway) {}

  @Get('board/:id')
  async getBoard(@Param('id') id: string) {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        lists: { include: { cards: { orderBy: { rank: 'asc' } } }, orderBy: { rank: 'asc' } }
      }
    });

    if (!board) return null;

    return {
      ...board,
      columns: board.lists.map((list: any) => ({
        id: list.id,
        title: list.title,
        order: parseFloat(list.rank),
        boardId: list.boardId,
        tasks: list.cards.map((card: any) => ({
          id: card.id, title: card.title, order: parseFloat(card.rank), columnId: card.listId
        }))
      }))
    };
  }

  @Post('columns')
  async createColumn(@Body() body: { title: string; boardId: string; order: number }) {
    const list = await this.prisma.list.create({
      data: { title: body.title, boardId: body.boardId, rank: toRank(body.order) }
    });
    this.events.server.emit('boardUpdated', { boardId: list.boardId });
    return { id: list.id, title: list.title, order: parseFloat(list.rank), boardId: list.boardId };
  }

  @Post('tasks')
  async createTask(@Request() req: any, @Body() body: { title: string; columnId: string; order: number }) {
    const list = await this.prisma.list.findUnique({ where: { id: body.columnId } });
    if (!list) return null;

    // Fim da gambiarra! O ID do usuário agora vem direto do Token Criptografado 100% Seguro
    const userId = req.user.sub || req.user.id; 

    const card = await this.prisma.card.create({
      data: { 
        title: body.title, 
        listId: body.columnId, 
        rank: toRank(body.order),
        boardId: list.boardId,
        createdById: userId,
        status: 'TODO'
      }
    });
    
    this.events.server.emit('boardUpdated', { boardId: list.boardId });
    return { id: card.id, title: card.title, order: parseFloat(card.rank), columnId: card.listId };
  }

  @Patch('tasks/:id')
  async updateTask(@Param('id') id: string, @Body() body: { columnId?: string; order?: number }) {
    const data: any = {};
    if (body.columnId) data.listId = body.columnId;
    if (body.order !== undefined) data.rank = toRank(body.order);

    const card = await this.prisma.card.update({ where: { id }, data });
    this.events.server.emit('boardUpdated', { boardId: card.boardId });
    return { id: card.id, title: card.title, order: parseFloat(card.rank), columnId: card.listId };
  }

  // NOVA ROTA: Deletar Cartão
  @Delete('tasks/:id')
  async deleteTask(@Param('id') id: string) {
    const card = await this.prisma.card.findUnique({ where: { id }});
    if (!card) return null;
    await this.prisma.card.delete({ where: { id } });
    this.events.server.emit('boardUpdated', { boardId: card.boardId });
    return { success: true };
  }
}

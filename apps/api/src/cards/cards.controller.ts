import { Controller, Post, Param, Body, UseGuards, UsePipes, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { MoveCardRequestSchema, rankBetween, rankInitial } from '@kanban/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/move')
  @UsePipes(new ZodValidationPipe(MoveCardRequestSchema))
  async moveCard(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({ where: { id } });
      if (!card || card.archivedAt) throw new NotFoundException('Card not found');

      const membership = await tx.membership.findFirst({
        where: { boardId: card.boardId, userId: user.sub, revokedAt: null }
      });
      if (!membership || membership.role === 'viewer') throw new ForbiddenException('Acesso negado');

      let beforeRank = null;
      let afterRank = null;

      if (body.beforeCardId) {
        const bCard = await tx.card.findUnique({ where: { id: body.beforeCardId } });
        if (bCard) beforeRank = bCard.rank;
      }
      if (body.afterCardId) {
        const aCard = await tx.card.findUnique({ where: { id: body.afterCardId } });
        if (aCard) afterRank = aCard.rank;
      }

      let newRank = card.rank;
      // Se mudou de lista e não passou vizinhos, joga pro final da lista nova
      if (!beforeRank && !afterRank && body.toListId !== card.listId) {
         const lastCard = await tx.card.findFirst({
           where: { listId: body.toListId },
           orderBy: { rank: 'desc' }
         });
         newRank = lastCard ? rankBetween(lastCard.rank, null) : rankInitial();
      } else if (body.beforeCardId || body.afterCardId) {
         newRank = rankBetween(beforeRank, afterRank);
      }

      const updatedCard = await tx.card.update({
        where: { id },
        data: {
          listId: body.toListId,
          rank: newRank,
          version: { increment: 1 },
        }
      });

      const updatedBoard = await tx.board.update({
        where: { id: card.boardId },
        data: { version: { increment: 1 } }
      });

      // Grava o log de auditoria append-only exigido pela spec
      await tx.activityLog.create({
        data: {
          boardId: card.boardId,
          actorUserId: user.sub,
          eventType: 'card.moved',
          entityType: 'card',
          entityId: card.id,
          payload: { fromListId: card.listId, toListId: body.toListId, newRank, clientRequestId: body.clientRequestId }
        }
      });

      return { card: updatedCard, boardVersion: updatedBoard.version };
    });
  }
}

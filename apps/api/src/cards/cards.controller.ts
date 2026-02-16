import { Controller, Post, Param, Body, UseGuards, UsePipes, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { MoveCardRequestSchema, rankBetween, rankInitial } from '@kanban/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EventsGateway } from '../events/events.gateway';
import { randomUUID } from 'crypto';

@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  // Cache in-memory LRU simples para idempotência baseada no clientRequestId (Exigência da Spec)
  private idempotencyCache = new Map<string, any>();

  constructor(private prisma: PrismaService, private eventsGateway: EventsGateway) {}

  @Post(':id/move')
  @UsePipes(new ZodValidationPipe(MoveCardRequestSchema))
  async moveCard(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    const cacheKey = `${user.sub}:${body.clientRequestId}`;
    
    // 1. Deduplicação: Se a mesma requisição do frontend chegar 2x, devolvemos a resposta cacheada sem mexer no banco
    if (this.idempotencyCache.has(cacheKey)) {
      return this.idempotencyCache.get(cacheKey);
    }

    // 2. Transação Atômica LWW no Banco de Dados (Calcula novo Rank Lexicográfico)
    const result = await this.prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({ where: { id } });
      if (!card || card.archivedAt) throw new NotFoundException('Card not found');

      const membership = await tx.membership.findFirst({
        where: { boardId: card.boardId, userId: user.sub, revokedAt: null }
      });
      if (!membership || membership.role === 'viewer') throw new ForbiddenException('Acesso negado');

      const oldListId = card.listId;

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

      // Auditoria Append-Only
      await tx.activityLog.create({
        data: {
          boardId: card.boardId,
          actorUserId: user.sub,
          eventType: 'card.moved',
          entityType: 'card',
          entityId: card.id,
          payload: { fromListId: oldListId, toListId: body.toListId, newRank, clientRequestId: body.clientRequestId }
        }
      });

      return { card: updatedCard, boardVersion: updatedBoard.version, fromListId: oldListId };
    });

    const responsePayload = { card: result.card, boardVersion: result.boardVersion };
    
    // Grava no cache de Idempotência e limpa após 60 segundos
    this.idempotencyCache.set(cacheKey, responsePayload);
    setTimeout(() => this.idempotencyCache.delete(cacheKey), 60000);

    // 3. Emissão Pós-Commit para o Motor WebSocket (O Broadcast)
    this.eventsGateway.broadcast(result.card.boardId, 'card.moved', {
      eventId: randomUUID(),
      boardId: result.card.boardId,
      boardVersion: result.boardVersion,
      actorUserId: user.sub,
      serverTime: new Date().toISOString(),
      type: 'card.moved',
      cardId: result.card.id,
      fromListId: result.fromListId,
      toListId: body.toListId,
      newRank: result.card.rank,
      cardVersion: result.card.version
    });

    return responsePayload;
  }
}

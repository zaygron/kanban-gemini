import { Controller, Get, Param, UseGuards, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('boards')
export class BoardsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getBoards(@CurrentUser() user: any) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId: user.sub, revokedAt: null },
      include: { board: true }
    });
    return memberships.map(m => m.board).filter(b => b.archivedAt === null);
  }

  @Get(':id')
  async getBoardDetails(@Param('id') id: string, @CurrentUser() user: any) {
    const membership = await this.prisma.membership.findFirst({
      where: { boardId: id, userId: user.sub, revokedAt: null }
    });
    if (!membership) throw new ForbiddenException('Acesso negado');

    const board = await this.prisma.board.findFirst({
      where: { id, archivedAt: null },
      include: {
        lists: { where: { archivedAt: null }, orderBy: { rank: 'asc' } },
        cards: { where: { archivedAt: null }, orderBy: { rank: 'asc' } },
        memberships: { where: { revokedAt: null } }
      }
    });
    
    if (!board) throw new NotFoundException('Board não encontrado');

    const { lists, cards, memberships, version, ...boardData } = board;
    return { board: { ...boardData, version }, lists, cards, memberships, boardVersion: version };
  }
}

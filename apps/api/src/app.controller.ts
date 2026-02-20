import { Controller, Get, Post, Body, Request, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { KanbanGuard } from './auth/kanban.guard';

@UseGuards(KanbanGuard)
@Controller()
export class AppController {
  constructor(private prisma: PrismaService) { }

  @Get('me')
  async getProfile(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) user.passwordHash = 'hidden';
    return { user: user || req.user };
  }

  // 🚀 O GRANDE TRUQUE: Agora busca os quadros que você CRIOU ou que FOI CONVIDADO!
  @Get('boards')
  async getBoards(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const userRole = req.user?.role;

    if (userRole === 'MASTER' || userRole === 'ADMIN') {
      return this.prisma.board.findMany({
        orderBy: { createdAt: 'desc' },
        include: { members: true } // Include members to show badges correctly on frontend
      });
    }

    return this.prisma.board.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId: userId } } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: { members: true }
    });
  }

  @Post('boards')
  async createBoard(@Request() req: any, @Body() body: { name: string }) {
    const userId = req.user?.sub || req.user?.id;
    return this.prisma.board.create({
      data: { name: body.name, createdById: userId }
    });
  }
}

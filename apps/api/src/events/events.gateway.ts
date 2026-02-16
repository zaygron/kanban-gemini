import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as cookie from 'cookie';
import { randomUUID } from 'crypto';

@WebSocketGateway({ cors: { origin: 'http://localhost:3000', credentials: true } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private jwtService: JwtService, private prisma: PrismaService) {}

  // Autenticação no aperto de mão (Handshake) usando cookie HttpOnly
  async handleConnection(client: Socket) {
    try {
      const rawCookie = client.handshake.headers.cookie;
      if (!rawCookie) throw new Error('Cookie não encontrado');
      
      const parsed = cookie.parse(rawCookie);
      const token = parsed.accessToken;
      if (!token) throw new Error('Token não encontrado');
      
      const payload = await this.jwtService.verifyAsync(token, { secret: 'kanban_secret_v2' });
      client.data.user = payload; // Salva a sessão autenticada na conexão do socket
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Tratamento futuro de presença offline (fora do escopo MVP)
  }

  @SubscribeMessage('board.join')
  async handleJoinBoard(@ConnectedSocket() client: Socket, @MessageBody() data: { boardId: string }) {
    const user = client.data.user;
    if (!user || !data?.boardId) return;

    // Autorização: O usuário só entra na sala se tiver membership ativa (Regra da Spec)
    const membership = await this.prisma.membership.findFirst({
      where: { boardId: data.boardId, userId: user.sub, revokedAt: null }
    });

    if (membership) {
      const roomName = `board:${data.boardId}`;
      client.join(roomName);

      // Snapshot obrigatório para sincronizar quem acabou de entrar ou reconectar
      const board = await this.prisma.board.findFirst({
        where: { id: data.boardId, archivedAt: null },
        include: {
          lists: { where: { archivedAt: null }, orderBy: { rank: 'asc' } },
          cards: { where: { archivedAt: null }, orderBy: { rank: 'asc' } },
          memberships: { where: { revokedAt: null } }
        }
      });

      if (board) {
        const { lists, cards, memberships, version, ...boardData } = board;
        client.emit('board.snapshot', {
          eventId: randomUUID(),
          boardId: data.boardId,
          boardVersion: version,
          actorUserId: user.sub,
          serverTime: new Date().toISOString(),
          type: 'board.snapshot',
          board: { ...boardData, version },
          lists,
          cards,
          memberships
        });
      }
    }
  }

  broadcast(boardId: string, eventType: string, payload: any) {
    // Emite o evento restrito APENAS para a sala do board específico
    this.server.to(`board:${boardId}`).emit(eventType, payload);
  }
}

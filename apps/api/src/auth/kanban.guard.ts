import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class KanbanGuard implements CanActivate {
  private jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'super_secret_kanban_key_2026' });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       throw new UnauthorizedException('Acesso negado: Token ausente.');
    }

    const token = authHeader.split(' ')[1];
    try {
      request.user = await this.jwtService.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('Acesso negado: Sessão inválida ou expirada.');
    }
  }
}

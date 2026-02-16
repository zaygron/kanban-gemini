import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class KanbanGuard implements CanActivate {
  // Instanciamos diretamente para evitar conflitos de Injeção de Dependência
  private jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'super_secret_kanban_key_2026' });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extrai o cookie 'Authentication' injetado no momento do Login
    const token = request.cookies?.Authentication;

    if (!token) {
      throw new UnauthorizedException('Acesso negado: Você não está logado na API.');
    }

    try {
      // Valida a assinatura criptográfica do Token
      const payload = await this.jwtService.verifyAsync(token);
      
      // Injeta o usuário validado na requisição para a Controller utilizar
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Acesso negado: Sessão inválida ou expirada.');
    }
  }
}

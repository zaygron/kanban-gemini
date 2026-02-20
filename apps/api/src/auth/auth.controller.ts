import { Controller, Post, Body, UnauthorizedException, BadRequestException, UseGuards, Request, ForbiddenException, Patch, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';
import { KanbanGuard } from './kanban.guard';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private jwtService: JwtService, private mailService: MailService) { }

  // 🔒 Rota Pública de Registro DESATIVADA ou ALTERADA para apenas aceitar token de convite no futuro.
  // Por enquanto, vamos manter APENAS para o Master inicial (se não houver usuários).
  @Post('register-setup')
  async registerSetup(@Body() body: any) {
    const count = await this.prisma.user.count();
    if (count > 0) throw new ForbiddenException('O registro público está desativado. Peça um convite.');

    if (!body.email || !body.password || !body.name) throw new BadRequestException('Dados incompletos.');

    const hash = await bcrypt.hash(body.password, 10);
    const user = await this.prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash: hash, role: 'MASTER' }
    });

    const token = await this.jwtService.signAsync({ sub: user.id, email: user.email, role: 'MASTER' });
    return { success: true, token, user: { id: user.id, name: user.name, email: user.email, role: 'MASTER' } };
  }

  @UseGuards(KanbanGuard)
  @Post('invite')
  async inviteUser(@Request() req: any, @Body() body: { email: string; role: 'ADMIN' | 'COMMON'; name: string }) {
    const inviterId = req.user.sub || req.user.id;
    const inviter = await this.prisma.user.findUnique({ where: { id: inviterId } });

    if (!inviter || (inviter.role !== 'MASTER' && inviter.role !== 'ADMIN')) {
      throw new ForbiddenException('Apenas Masters e Admins podem convidar');
    }
    if (inviter.role === 'ADMIN' && body.role !== 'COMMON') {
      throw new ForbiddenException('Admins só podem convidar membros Comuns');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new BadRequestException('E-mail já cadastrado');

    // Senha temporária aleatória (6 chars)
    const tempPassword = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(tempPassword, 10);

    const newUser = await this.prisma.user.create({
      data: {
        name: body.name || body.email.split('@')[0],
        email: body.email,
        passwordHash: hash,
        role: body.role,
        mustChangePassword: true,
        invitedById: inviter.id
      }
    });

    // Enviar E-mail (Mock por enquanto)
    const inviteLink = `http://localhost:3000/login?email=${encodeURIComponent(body.email)}`;
    await this.mailService.sendInvite(body.email, inviteLink, tempPassword);

    return { success: true, message: 'Convite enviado!', tempPassword }; // tempPassword retornado só para debug/dev
  }

  @UseGuards(KanbanGuard)
  @Patch('change-password')
  async changePassword(@Request() req: any, @Body() body: { currentPassword?: string, newPassword: string }) {
    const userId = req.user.sub || req.user.id;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Se deve trocar senha, opcionalmente pedimos a senha atual (temp) ou apenas confiamos no token logado
    // Para simplificar: se mustChangePassword=true, não exige currentPassword
    if (!user.mustChangePassword) {
      if (!body.currentPassword) throw new BadRequestException('Senha atual necessária');
      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!valid) throw new UnauthorizedException('Senha atual incorreta');
    }

    const hash = await bcrypt.hash(body.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, mustChangePassword: false }
    });

    return { success: true, message: 'Senha atualizada!' };
  }

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');

    const isMatch = await bcrypt.compare(body.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Credenciais inválidas.');

    const token = await this.jwtService.signAsync({ sub: user.id, email: user.email, role: user.role });
    return {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    };
  }

  @Post('logout')
  async logout() {
    return { success: true };
  }
}

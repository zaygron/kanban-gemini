import { Controller, Post, Body, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  @Post('register')
  async register(@Body() body: any) {
    if (!body.email || !body.password || !body.name) {
      throw new BadRequestException('Nome, e-mail e senha são obrigatórios.');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      throw new BadRequestException('Este e-mail já está em uso por outra conta.');
    }

    const hash = await bcrypt.hash(body.password, 10);
    const user = await this.prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash: hash }
    });

    // Já gera o token de acesso instantâneo para não forçar o usuário a logar de novo
    const token = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return { success: true, token, user: { id: user.id, name: user.name, email: user.email } };
  }

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');
    
    const isMatch = await bcrypt.compare(body.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Credenciais inválidas.');

    const token = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return { success: true, token, user: { id: user.id, name: user.name, email: user.email } };
  }

  @Post('logout')
  async logout() {
    return { success: true };
  }
}

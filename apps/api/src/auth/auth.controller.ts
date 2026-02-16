import { Controller, Post, Body, Res, Get, UseGuards, UsePipes, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginRequestSchema } from '@kanban/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginRequestSchema))
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, { secret: 'kanban_secret_v2', expiresIn: '7d' });
    
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    return { success: true };
  }
}

@Controller('me')
export class MeController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProfile(@CurrentUser() user: any) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!dbUser) throw new UnauthorizedException();
    const { passwordHash, ...safeUser } = dbUser;
    return { user: safeUser };
  }
}

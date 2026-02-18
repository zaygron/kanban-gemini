import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'super_secret_kanban_key_2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  // Removido o MeController fantasma que estava quebrando tudo
  controllers: [AuthController] 
})
export class AuthModule {}

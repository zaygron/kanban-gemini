import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, MeController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [JwtAuthGuard],
  controllers: [AuthController, MeController],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}

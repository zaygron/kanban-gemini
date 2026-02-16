import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BoardsModule } from './boards/boards.module';
import { CardsModule } from './cards/cards.module';

@Module({
  imports: [PrismaModule, AuthModule, BoardsModule, CardsModule],
})
export class AppModule {}

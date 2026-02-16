import { KanbanModule } from './kanban/kanban.module';
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BoardsModule } from './boards/boards.module';
import { CardsModule } from './cards/cards.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    KanbanModule,PrismaModule, AuthModule, EventsModule, BoardsModule, CardsModule],
})
export class AppModule {}

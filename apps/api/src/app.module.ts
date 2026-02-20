import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KanbanModule } from './kanban/kanban.module';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    KanbanModule,
    EventsModule,
    UsersModule
  ],
  controllers: [AppController],
})
export class AppModule { }

import { Module } from '@nestjs/common';
import { KanbanController } from './kanban.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [KanbanController],
})
export class KanbanModule {}

import { Module } from '@nestjs/common';
import { KanbanController } from './kanban.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, EventsModule, MailModule],
  controllers: [KanbanController],
})
export class KanbanModule { }

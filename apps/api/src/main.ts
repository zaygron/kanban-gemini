import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const prisma = app.get(PrismaService);
  const userExists = await prisma.user.findUnique({ where: { email: 'owner@kanban.com' } });
  
  if (!userExists) {
    const hash = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: { email: 'owner@kanban.com', name: 'Tech Lead Kanban', passwordHash: hash }
    });
  }

  // origin: true faz a API espelhar a origem dinamicamente (aceita qualquer IP que o navegador mandar)
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());
  
  // Remover o '0.0.0.0' daqui obriga o Node.js a escutar nas duas redes (IPv4 e IPv6) nativamente!
  await app.listen(3001);
}
bootstrap();

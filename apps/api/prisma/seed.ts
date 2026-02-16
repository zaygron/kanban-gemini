import { PrismaClient } from '@prisma/client';
import { rankInitial, rankBetween } from '@kanban/shared';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o Seed...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Criar Usuários
  const owner = await prisma.user.upsert({
    where: { email: 'owner@kanban.com' },
    update: {},
    create: {
      email: 'owner@kanban.com',
      name: 'Owner Admin',
      passwordHash,
    },
  });

  const memberEmails = ['alice@kanban.com', 'bob@kanban.com', 'charlie@kanban.com'];
  const members = [];
  for (const email of memberEmails) {
    const m = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: email.split('@')[0],
        passwordHash,
      },
    });
    members.push(m);
  }

  // 2. Criar Board
  let board = await prisma.board.findFirst();
  if (!board) {
    board = await prisma.board.create({
      data: {
        name: 'Engenharia - Roadmap v2',
        createdById: owner.id,
      }
    });

    // Memberships
    await prisma.membership.create({ data: { boardId: board.id, userId: owner.id, role: 'owner' }});
    for (const m of members) {
      await prisma.membership.create({ data: { boardId: board.id, userId: m.id, role: 'member' }});
    }

    // 3. Criar Listas com Rank
    const titles = ['Backlog', 'In Progress', 'Done'];
    let currentListRank = rankInitial();
    const createdLists = [];

    for (const title of titles) {
      const list = await prisma.list.create({
        data: {
          boardId: board.id,
          title,
          rank: currentListRank
        }
      });
      createdLists.push(list);
      currentListRank = rankBetween(currentListRank, null);
    }

    // 4. Distribuir 10 Cards
    const cardsData = [
      { list: createdLists[0], title: 'Refatorar DTOs REST', desc: 'Migrar tudo para Zod.' },
      { list: createdLists[0], title: 'Configurar CI/CD', desc: 'Deploy automatizado no push.' },
      { list: createdLists[0], title: 'Ajustar índices do BD', desc: 'Focar na performance das buscas.' },
      { list: createdLists[0], title: 'Atualizar doc do Mermaid', desc: 'Diagramas da v2.' },
      
      { list: createdLists[1], title: 'Implementar Algoritmo LexoRank', desc: 'Garantir espaço ilimitado.' },
      { list: createdLists[1], title: 'Setup do Socket.IO', desc: 'Salas e autenticação JWT.' },
      { list: createdLists[1], title: 'Integrar dnd-kit no Frontend', desc: 'Drag fluido.' },
      
      { list: createdLists[2], title: 'Definir Contratos', desc: 'Criar repositório shared.' },
      { list: createdLists[2], title: 'Monorepo pnpm', desc: 'Workspace inicializado.' },
      { list: createdLists[2], title: 'Validar Spec v2', desc: 'Reunião com time.' },
    ];

    const listRanks: Record<string, string> = {};

    for (const cData of cardsData) {
      const lid = cData.list.id;
      if (!listRanks[lid]) {
        listRanks[lid] = rankInitial();
      } else {
        listRanks[lid] = rankBetween(listRanks[lid], null);
      }

      await prisma.card.create({
        data: {
          boardId: board.id,
          listId: lid,
          title: cData.title,
          description: cData.desc,
          status: 'ACTIVE',
          rank: listRanks[lid],
          createdById: owner.id,
          assignedTo: members[Math.floor(Math.random() * members.length)].id
        }
      });
    }
    
    console.log(`✅ Board criado e 10 cartões semeados perfeitamente (ordenados com LexoRank).`);
  } else {
    console.log(`ℹ️ Board já existe, pulando seed...`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

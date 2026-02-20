// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Carregar .env manualmente para evitar dependência de 'dotenv'
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index !== -1) {
            const key = trimmed.substring(0, index).trim();
            const value = trimmed.substring(index + 1).trim();
            if (key && value && !process.env[key]) {
                process.env[key] = value;
            }
        }
    });
}

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('Por favor, forneça o e-mail do usuário: npx ts-node apps/api/scripts/promote_master.ts user@email.com');
        process.exit(1);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.error('Usuário não encontrado.');
        process.exit(1);
    }

    await prisma.user.update({
        where: { email },
        data: { role: 'MASTER' } as any,
    });

    console.log(`Usuário ${email} promovido para MASTER com sucesso!`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

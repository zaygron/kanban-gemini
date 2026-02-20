import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor() {
        this.logger.warn('SMTP não configurado ou módulo ausente. E-mails serão simulados no console.');
    }

    async sendInvite(email: string, inviteLink: string, passwordTemp: string) {
        const subject = 'Convite para o Kanban';
        const text = `Você foi convidado! \n\nAcesse: ${inviteLink} \nSenha Temporária: ${passwordTemp}\n\nVocê precisará trocar a senha no primeiro acesso.`;

        // MOCK LOG SEMPRE POR ENQUANTO
        console.log('--- [MOCK EMAIL] ---');
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${text}`);
        console.log('--------------------');
    }

    async sendDateChangeNotification(to: string, cardTitle: string, changeDetails: string, user: string) {
        const subject = `Alteração em Tarefa: ${cardTitle}`;
        const text = `O usuário ${user} alterou datas na tarefa "${cardTitle}".\n\nDetalhes:\n${changeDetails}`;

        console.log('--- [MOCK EMAIL ALERT] ---');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${text}`);
        console.log('--------------------------');
    }
}

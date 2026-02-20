import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        const host = process.env.SMTP_HOST;
        const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (host && port) {
            const transportConfig: any = {
                host,
                port,
                secure: port === 465, // true for 465, false for other ports
            };

            if (user && pass) {
                transportConfig.auth = {
                    user,
                    pass,
                };
            }

            this.transporter = nodemailer.createTransport(transportConfig);
            this.logger.log(`Serviço SMTP configurado em ${host}:${port} ${user ? `com o usuário ${user}` : '(Sem autenticação / Relay IP)'}`);
        } else {
            this.logger.warn('SMTP não configurado (Faltam variáveis HOST/PORT). E-mails serão simulados no console.');
        }
    }

    async sendInvite(email: string, inviteLink: string, passwordTemp: string) {
        const subject = 'Convite para o Kanban';
        const text = `Você foi convidado! \n\nAcesse: ${inviteLink} \nSenha Temporária: ${passwordTemp}\n\nVocê precisará trocar a senha no primeiro acesso.`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #2563eb;">Convite para o Kanban</h2>
                <p>Olá,</p>
                <p>Você foi convidado para participar do nosso sistema de Kanban.</p>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Acesso:</strong> <a href="${inviteLink}">${inviteLink}</a></p>
                    <p style="margin: 10px 0 0 0;"><strong>Senha Temporária:</strong> <code style="background: #e5e7eb; padding: 3px 6px; border-radius: 4px;">${passwordTemp}</code></p>
                </div>
                <p><em>* Você precisará criar uma nova senha assim que fizer o primeiro login de segurança.</em></p>
            </div>
        `;

        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: process.env.SMTP_FROM || `"Kanban App" <${process.env.SMTP_USER}>`,
                    to: email,
                    subject,
                    text,
                    html,
                });
                this.logger.log(`E-mail de convite enviado de verdade para: ${email}`);
            } catch (error) {
                this.logger.error(`Falha ao enviar e-mail real para ${email}:`, error);
            }
        } else {
            // MOCK LOG SIMULATION
            console.log('--- [MOCK EMAIL] ---');
            console.log(`To: ${email}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body:\n${text}`);
            console.log('--------------------');
        }
    }

    async sendDateChangeNotification(to: string, cardTitle: string, changeDetails: string, user: string) {
        const subject = `Alteração em Tarefa: ${cardTitle}`;
        const text = `O usuário ${user} alterou datas na tarefa "${cardTitle}".\n\nDetalhes:\n${changeDetails}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h3 style="color: #d97706;">Alteração em Tarefa</h3>
                <p>O usuário <strong>${user}</strong> realizou alterações de prazos na tarefa <strong>${cardTitle}</strong>.</p>
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; white-space: pre-wrap;">${changeDetails}</p>
                </div>
            </div>
        `;

        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: process.env.SMTP_FROM || `"Kanban App" <${process.env.SMTP_USER}>`,
                    to,
                    subject,
                    text,
                    html,
                });
            } catch (error) {
                this.logger.error(`Falha ao enviar notificação real para ${to}:`, error);
            }
        } else {
            console.log('--- [MOCK EMAIL ALERT] ---');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body:\n${text}`);
            console.log('--------------------------');
        }
    }
}

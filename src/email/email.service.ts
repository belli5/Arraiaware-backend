import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpSecure = this.configService.get<boolean>('SMTP_SECURE');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

   
    this.logger.log(`SMTP_HOST lido: ${smtpHost}`);
    this.logger.log(`SMTP_PORT lido: ${smtpPort}`);
    this.logger.log(`SMTP_SECURE lido: ${smtpSecure}`);
    this.logger.log(`SMTP_USER lido: ${smtpUser || '[Vazio]'}`);

    const authOptions = (smtpUser && smtpPass) ? {
      user: smtpUser,
      pass: smtpPass,
    } : undefined; 

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: authOptions,
    });
    this.logger.log('Nodemailer transporter configurado.');
  }

  async sendWelcomeEmail(to: string, initialPassword: string) {
    const mailOptions = {
      from: `"Plataforma RPE" <${this.configService.get<string>('SMTP_FROM_EMAIL')}>`,
      to: to,
      subject: 'Bem-vindo à Plataforma de Avaliação RPE!',
      html: `
        <h1>Bem-vindo(a) à Rocket Corp!</h1>
        <p>Sua conta na nossa plataforma de avaliação de desempenho (RPE) foi criada.</p>
        <p>Você pode acessar o sistema usando seu email e a senha temporária abaixo:</p>
        <p><b>Senha Temporária:</b> ${initialPassword}</p>
        <p>Recomendamos que você altere sua senha no primeiro acesso.</p>
        <br>
        <p>Atenciosamente,</p>
        <p>Equipe Rocket Corp.</p>
      `,
    };

  
    this.logger.log(`Tentando enviar e-mail de boas-vindas para: ${to}`);
    this.logger.debug(`Opções do e-mail (destinatário e assunto): Para: ${mailOptions.to}, Assunto: ${mailOptions.subject}`);


    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email de boas-vindas enviado com sucesso para: ${to}. Mensagem ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar email de boas-vindas para ${to}: ${error.message}`, error.stack);
    }
  }
}
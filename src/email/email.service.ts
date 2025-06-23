import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name); 

  constructor(private configService: ConfigService) {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    const authOptions = (smtpUser && smtpPass) ? {
      user: smtpUser,
      pass: smtpPass,
    } : undefined; 

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<number>('SMTP_PORT') === 465,
      auth: authOptions,
    });
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

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
     
      this.logger.error(`Erro ao enviar email de boas-vindas para ${to}: ${error.message}`, error.stack);
      
    }
  }
}
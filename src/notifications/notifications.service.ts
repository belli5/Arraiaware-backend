import { Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private emailService: EmailService) {}

  async sendBrutalFactsToMentor(mentor: User, mentee: User, brutalFacts: string, cycleName: string) {
    if (!mentor.email) {
      this.logger.warn(`Mentor ${mentor.name} (ID: ${mentor.id}) não possui email para receber notificação.`);
      return;
    }
    
    await this.emailService.sendBrutalFactsEmail(
      mentor.email,
      mentor.name,
      mentee.name,
      cycleName,
      brutalFacts,
    );
  }
}
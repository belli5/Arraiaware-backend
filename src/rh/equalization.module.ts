import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EqualizationController } from './equalization.controller';
import { EqualizationService } from './equalization.service';
import { GenAIModule } from 'src/gen-ai/gen-ai.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PdfModule } from 'src/pdf/pdf.module';

@Module({
  imports: [PrismaModule, GenAIModule,NotificationsModule,PdfModule],
  controllers: [EqualizationController],
  providers: [EqualizationService],
  exports: [EqualizationService],
})
export class EqualizationModule {}
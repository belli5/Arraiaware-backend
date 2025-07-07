import { Module } from '@nestjs/common';
import { EncryptionModule } from 'src/common/encryption/encryption.module';
import { GenAIModule } from 'src/gen-ai/gen-ai.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PdfModule } from 'src/pdf/pdf.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EqualizationController } from './equalization.controller';
import { EqualizationService } from './equalization.service';

@Module({
  imports: [PrismaModule, GenAIModule,NotificationsModule,PdfModule, EncryptionModule,],
  controllers: [EqualizationController],
  providers: [EqualizationService],
  exports: [EqualizationService],
})
export class EqualizationModule {}
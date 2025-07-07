import { Module } from '@nestjs/common';
import { EncryptionModule } from '../common/encryption/encryption.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

@Module({
  imports: [
    PrismaModule,
    EncryptionModule, 
  ],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
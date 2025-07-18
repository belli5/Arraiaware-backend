import { Module } from '@nestjs/common';
import { EncryptionModule } from 'src/common/encryption/encryption.module';
import { GenAIModule } from '../gen-ai/gen-ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EqualizationModule } from '../rh/equalization.module';
import { CommitteeController } from './committee.controller';
import { CommitteeService } from './committee.service';

@Module({
  imports: [
    PrismaModule,
    GenAIModule,
    EqualizationModule,
    EncryptionModule,
  ],
  controllers: [CommitteeController],
  providers: [CommitteeService],
})
export class CommitteeModule {}

import { Module } from '@nestjs/common';
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
  ],
  controllers: [CommitteeController],
  providers: [CommitteeService],
})
export class CommitteeModule {}
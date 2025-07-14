import { Module } from '@nestjs/common';
import { PdiService } from './pdi.service';
import { PdiController } from './pdi.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GenAIModule } from '../gen-ai/gen-ai.module';
import { EvaluationsModule } from '../evaluations/evaluations.module';

@Module({
  imports: [PrismaModule, GenAIModule, EvaluationsModule],
  controllers: [PdiController],
  providers: [PdiService],
})
export class PdiModule {}
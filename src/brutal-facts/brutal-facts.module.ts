import { Module } from '@nestjs/common';
import { GenAIModule } from '../gen-ai/gen-ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BrutalFactsController } from './brutal-facts.controller';
import { BrutalFactsService } from './brutal-facts.service';

@Module({
  imports: [PrismaModule, GenAIModule],
  controllers: [BrutalFactsController],
  providers: [BrutalFactsService],
})
export class BrutalFactsModule {}
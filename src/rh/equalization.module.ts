import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EqualizationController } from './equalization.controller';
import { EqualizationService } from './equalization.service';
import { GenAIModule } from 'src/gen-ai/gen-ai.module';

@Module({
  imports: [PrismaModule, GenAIModule],
  controllers: [EqualizationController],
  providers: [EqualizationService],
})
export class EqualizationModule {}
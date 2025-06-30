import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EqualizationController } from './equalization.controller';
import { EqualizationService } from './equalization.service';

@Module({
  imports: [PrismaModule],
  controllers: [EqualizationController],
  providers: [EqualizationService],
})
export class EqualizationModule {}
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CyclesController } from './cycles.controller';
import { CyclesService } from './cycles.service';

@Module({
  imports: [PrismaModule],
  controllers: [CyclesController],
  providers: [CyclesService],
  exports: [CyclesService], 
})
export class CyclesModule {}
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommitteeController } from './committee.controller';
import { CommitteeService } from './committee.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommitteeController],
  providers: [CommitteeService],
})
export class CommitteeModule {}
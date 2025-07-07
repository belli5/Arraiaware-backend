import { Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RhController } from './rh.controller';
import { RhService } from './rh.service';
import { EvaluationsModule } from 'src/evaluations/evaluations.module';

@Module({
  imports: [PrismaModule, EmailModule,EvaluationsModule],
  controllers: [RhController],
  providers: [RhService],

})
export class RhModule {}
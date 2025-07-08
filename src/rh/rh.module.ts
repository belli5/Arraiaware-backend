import { Module } from '@nestjs/common';
import { AuditModule } from 'src/AuditModule/audit.module';
import { EmailModule } from 'src/email/email.module';
import { EvaluationsModule } from 'src/evaluations/evaluations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RhController } from './rh.controller';
import { RhService } from './rh.service';

@Module({
  imports: [PrismaModule, EmailModule,EvaluationsModule, AuditModule],
  controllers: [RhController],
  providers: [RhService],

})
export class RhModule {}
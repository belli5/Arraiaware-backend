import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CriteriaModule } from './criteria/criteria.module';
import { CyclesModule } from './cycles/cycles.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { RhModule } from './rh/rh.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    RolesModule,
    CriteriaModule,
    CyclesModule,
    EvaluationsModule,
    RhModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
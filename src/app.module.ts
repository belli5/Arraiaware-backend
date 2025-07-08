import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './AuditModule/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CommitteeModule } from './comitte/committee.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { CriteriaModule } from './criteria/criteria.module';
import { CyclesModule } from './cycles/cycles.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { GenAIModule } from './gen-ai/gen-ai.module';
import { ImportHistoryModule } from './import-history/import-history.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PdfModule } from './pdf/pdf.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { EqualizationModule } from './rh/equalization.module';
import { RhModule } from './rh/rh.module';
import { RolesModule } from './roles/roles.module';
import { TeamModule } from './team/team.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    AuditModule,
    PrismaModule,
    UsersModule,
    RolesModule,
    CriteriaModule,
    CyclesModule,
    EvaluationsModule,
    RhModule,
    ImportHistoryModule,
    ProjectsModule,
    DashboardModule,
    EqualizationModule,
    CommitteeModule,
    GenAIModule,
    NotificationsModule,
    TeamModule,
    PdfModule,
    EncryptionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
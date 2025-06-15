import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CriteriaModule } from './criteria/criteria.module';
import { PrismaModule } from './prisma/prisma.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, UsersModule, RolesModule, CriteriaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportHistoryController } from './import-history.controller';
import { ImportHistoryService } from './import-history.service';

@Module({
  imports: [PrismaModule],
  controllers: [ImportHistoryController],
  providers: [ImportHistoryService],
})
export class ImportHistoryModule {}
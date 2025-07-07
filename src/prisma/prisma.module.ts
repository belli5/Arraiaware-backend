import { Module } from '@nestjs/common';
import { EncryptionModule } from '../common/encryption/encryption.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [EncryptionModule], 
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
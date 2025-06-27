import { Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule,EmailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],

})
export class UsersModule {}

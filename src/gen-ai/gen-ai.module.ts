import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GenAIService } from './gen-ai.service';

@Module({
  imports: [ConfigModule],
  providers: [GenAIService],
  exports: [GenAIService],
})
export class GenAIModule {}
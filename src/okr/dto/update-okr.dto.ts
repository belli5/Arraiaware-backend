import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateObjectiveDto {
  @ApiPropertyOptional({ description: 'O novo título do objetivo' })
  @IsString()
  @IsOptional()
  title?: string;
}

export class UpdateKeyResultDto {
  @ApiPropertyOptional({ description: 'O novo título do resultado-chave' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Progresso do resultado-chave (de 0 a 100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @ApiPropertyOptional({ enum: ['A fazer', 'Em andamento', 'Concluído'] })
  @IsString()
  @IsOptional()
  status?: string;
}
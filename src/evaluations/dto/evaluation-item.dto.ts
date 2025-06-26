import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class EvaluationItemDto {
  @ApiProperty({ description: 'ID do critério que está sendo avaliado' })
  @IsUUID()
  criterionId: string;

  @ApiProperty({ description: 'Nota de 1 a 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @ApiProperty({ description: 'Justificativa obrigatória para a nota' })
  @IsString()
  @IsNotEmpty()
  justification: string;

  @ApiPropertyOptional({ description: 'Descrição textual da nota (ex: "Supera as expectativas")' })
  @IsString()
  @IsOptional()
  scoreDescription?: string;
}
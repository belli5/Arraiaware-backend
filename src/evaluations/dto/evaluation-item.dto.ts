import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';

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
}
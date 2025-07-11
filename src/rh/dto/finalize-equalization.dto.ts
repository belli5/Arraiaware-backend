import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class FinalizeEqualizationDto {
  @ApiProperty({ description: 'Nota final equalizada de 1 a 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  finalScore: number;

  @ApiPropertyOptional({
    description: 'Observações gerais do comitê sobre a equalização do colaborador',
    example: 'Apesar da baixa autoavaliação, o comitê reconheceu o bom desempenho do colaborador com base no feedback do líder e dos pares.'
  })
  @IsString()
  @IsOptional()
  committeeObservation?: string;
}
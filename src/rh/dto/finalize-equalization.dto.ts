import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

class FinalizedCriterionDto {
  @ApiProperty({ description: 'ID do critério que está sendo finalizado' })
  @IsUUID()
  criterionId: string;

  @ApiProperty({ description: 'Nota final equalizada de 1 a 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  finalScore: number;
}

export class FinalizeEqualizationDto {
  @ApiProperty({ 
    description: 'Array com os critérios e suas notas finais equalizadas',
    type: [FinalizedCriterionDto] 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinalizedCriterionDto)
  finalizedCriteria: FinalizedCriterionDto[];

  @ApiPropertyOptional({
    description: 'Observações gerais do comitê sobre a equalização do colaborador',
    example: 'Apesar da baixa autoavaliação, o comitê reconheceu o bom desempenho do colaborador com base no feedback do líder e dos pares.'
  })
  @IsString()
  @IsOptional()
  committeeObservation?: string;
}

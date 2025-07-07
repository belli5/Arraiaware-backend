import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateCommitteeEvaluationDto {
  @ApiPropertyOptional({
    description: 'A nota final consolidada pelo comitê (de 1 a 5)',
    example: 4.5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  finalScore?: number;

  @ApiPropertyOptional({
    description: 'Observação ou justificativa do comitê para a nota final',
    example: 'Performance consistente, com bom alinhamento aos valores da empresa.',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  observation?: string;
}
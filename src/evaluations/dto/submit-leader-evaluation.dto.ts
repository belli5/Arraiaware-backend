import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class SubmitLeaderEvaluationDto {
  @ApiProperty({ description: 'ID do líder que está realizando a avaliação' })
  @IsUUID()
  leaderId: string;

  @ApiProperty({ description: 'ID do colaborador que está sendo avaliado' })
  @IsUUID()
  collaboratorId: string;

  @ApiProperty({ description: 'ID do ciclo de avaliação atual' })
  @IsUUID()
  cycleId: string;

  @ApiProperty({ description: 'Nota para "Qualidade e pontualidade das entregas"', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  deliveryScore: number;

  @ApiProperty({ description: 'Nota para "Proatividade e iniciativa na resolução de problemas"', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  proactivityScore: number;

  @ApiProperty({ description: 'Nota para "Colaboração e trabalho em equipe"', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  collaborationScore: number;

  @ApiProperty({ description: 'Nota para "Habilidades técnicas e de negócio"', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  skillScore: number;

  @ApiPropertyOptional({ description: 'Justificativa ou observações gerais sobre o desempenho' })
  @IsString()
  @IsOptional()
  justification?: string;
}
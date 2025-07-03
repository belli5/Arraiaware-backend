import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class SubmitDirectReportEvaluationDto {
  @ApiProperty({ description: 'ID do colaborador que está realizando a avaliação' })
  @IsUUID()
  collaboratorId: string;

  @ApiProperty({ description: 'ID do líder que está sendo avaliado' })
  @IsUUID()
  leaderId: string;

  @ApiProperty({ description: 'ID do ciclo de avaliação atual' })
  @IsUUID()
  cycleId: string;

  @ApiProperty({ description: 'Nota para "Visão estratégica e direção clara"', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  visionScore: number;

  @ApiProperty({ description: 'Nota para "Capacidade de inspirar e motivar"', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  inspirationScore: number;

  @ApiProperty({ description: 'Nota para "Apoio no desenvolvimento da equipe"', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  developmentScore: number;

  @ApiProperty({ description: 'Nota para "Feedback construtivo e transparente"', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  feedbackScore: number;
}
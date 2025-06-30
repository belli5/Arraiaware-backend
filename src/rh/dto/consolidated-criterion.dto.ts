import { ApiProperty } from '@nestjs/swagger';

class EvaluationScoreDto {
  @ApiProperty({ example: 4 })
  score: number;

  @ApiProperty({ example: 'O colaborador demonstra excelente capacidade de...' })
  justification: string;
}

export class ConsolidatedCriterionDto {
  @ApiProperty()
  criterionId: string;

  @ApiProperty({ example: 'Sentimento de Dono' })
  criterionName: string;

  @ApiProperty({ type: EvaluationScoreDto, nullable: true })
  selfEvaluation?: EvaluationScoreDto;

  @ApiProperty({ type: EvaluationScoreDto, nullable: true })
  leaderEvaluation?: EvaluationScoreDto;

  @ApiProperty({ type: EvaluationScoreDto, nullable: true })
  peerEvaluation?: EvaluationScoreDto;

  @ApiProperty({
    description: 'Indica se há uma discrepância significativa entre as notas.',
    example: true,
  })
  hasDiscrepancy: boolean;
}
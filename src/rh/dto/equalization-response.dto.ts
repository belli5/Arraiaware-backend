import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsolidatedCriterionDto } from './consolidated-criterion.dto';

export class PeerFeedbackSummaryDto {
  @ApiProperty()
  evaluatorName: string;

  @ApiProperty()
  pointsToImprove: string;

  @ApiProperty()
  pointsToExplore: string;
}

export class ReferenceFeedbackSummaryDto {
  @ApiProperty()
  indicatedName: string;

  @ApiProperty()
  justification: string;
}

export class EqualizationResponseDto {
  @ApiProperty()
  collaboratorId: string;

  @ApiProperty({ example: 'João da Silva' })
  collaboratorName: string;

  @ApiProperty()
  cycleId: string;

  @ApiProperty({ example: 'Avaliação Semestral 2025.1' })
  cycleName: string;

  @ApiProperty({ type: [ConsolidatedCriterionDto] })
  consolidatedCriteria: ConsolidatedCriterionDto[];

  @ApiProperty({ type: [PeerFeedbackSummaryDto], description: "Sumário dos feedbacks 360 recebidos." })
  peerFeedbacks: PeerFeedbackSummaryDto[];

  @ApiProperty({ type: [ReferenceFeedbackSummaryDto], description: "Sumário das indicações de referência recebidas." })
  referenceFeedbacks: ReferenceFeedbackSummaryDto[];

  @ApiPropertyOptional({ description: "Resumo gerado por IA para auxiliar na equalização." })
  aiSummary?: string;
}
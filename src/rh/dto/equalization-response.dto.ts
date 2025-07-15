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

export class ReferenceReceivedSummaryDto {
  @ApiProperty()
  indicatorName: string; // Nome de quem indicou

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


  @ApiPropertyOptional({
    description: "Status da equalização do colaborador.",
    example: "Equalizada",
    enum: ['Equalizada', 'Pendente']
  })
  status?: string;


  @ApiProperty({ type: [ConsolidatedCriterionDto] })
  consolidatedCriteria: ConsolidatedCriterionDto[];


  @ApiProperty({ type: [PeerFeedbackSummaryDto], description: "Sumário dos feedbacks 360 recebidos." })
  peerFeedbacks: PeerFeedbackSummaryDto[];


  @ApiProperty({ type: [ReferenceFeedbackSummaryDto], description: "Sumário das indicações de referência recebidas." })
  referenceFeedbacks: ReferenceFeedbackSummaryDto[];

  @ApiProperty({ type: [ReferenceReceivedSummaryDto], description: "Sumário das indicações de referência RECEBIDAS pelo colaborador." })
  referencesReceived: ReferenceReceivedSummaryDto[];

  @ApiPropertyOptional({
    description: 'Os "Brutal Facts" gerados pela IA para a sessão de feedback.',
    example: 'A percepção sobre sua comunicação é consistentemente um ponto a ser melhorado...'
  })
  brutalFacts?: string;

  @ApiPropertyOptional({
    description: 'A nota final consolidada pelo comitê.',
    example: 4.5,
  })
  finalScore?: number;
}

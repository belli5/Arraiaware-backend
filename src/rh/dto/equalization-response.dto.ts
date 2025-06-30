import { ApiProperty } from '@nestjs/swagger';
import { ConsolidatedCriterionDto } from './consolidated-criterion.dto';

export class EqualizationResponseDto {
  @ApiProperty()
  collaboratorId: string;

  @ApiProperty({ example: 'João da Silva' })
  collaboratorName: string;

  @ApiProperty()
  cycleId: string;

  @ApiProperty({ example: 'Avaliação Semestral 2025.1' })
  cycleName: string;

  @ApiProperty({ 
    description: 'A média geral das avaliações de pares (360).',
    example: 4.5,
    nullable: true 
  })
  peerAverageScore?: number | null;

  @ApiProperty({ type: [ConsolidatedCriterionDto] })
  consolidatedCriteria: ConsolidatedCriterionDto[];
}
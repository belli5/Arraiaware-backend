import { ApiProperty } from '@nestjs/swagger';

class CriterionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  pillar: string;

  @ApiProperty()
  criterionName: string;

  @ApiProperty()
  description: string;
}

class LeaderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

export class LeaderEvaluationRecordDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  collaboratorId: string;

  @ApiProperty()
  cycleId: string;

  @ApiProperty()
  score: number;

  @ApiProperty()
  scoreDescription: string;

  @ApiProperty({ nullable: true })
  justification?: string | null;

  @ApiProperty({ type: () => CriterionDto })
  criterion: CriterionDto;

  @ApiProperty({ type: () => LeaderDto })
  leader: LeaderDto;
}

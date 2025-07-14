import { ApiProperty } from "@nestjs/swagger";

export class CycleCommitteInsightsInfoDto {
  @ApiProperty({ description: 'ID of the evaluation cycle' })
  cycleId: string;

  @ApiProperty({ description: 'Name of the evaluation cycle' })
  cycleName: string;

  @ApiProperty({ description: 'Overall average score for the cycle' })
  overallAverage: number;

  @ApiProperty({ description: 'Total number of collaborators in the cycle' })
  totalCollaborators: number;

  @ApiProperty({ description: 'Number of evaluations ready in the cycle' })
  readyEvaluations: number;

  @ApiProperty({ description: 'Number of pending evaluations in the cycle' })
  pendingEvaluations: number;

  @ApiProperty({ description: 'Number of projects in the cycle' })
  projectsInCycle: number;
}

export class CommitteInsightsInfo {
  @ApiProperty({ type: [CycleCommitteInsightsInfoDto], description: 'List of insights for each cycle' })
  cycles: CycleCommitteInsightsInfoDto[];

  @ApiProperty({ description: 'Total number of evaluation cycles' })
  cyclesAmount: number;

  @ApiProperty({ description: 'Overall average score across all cycles' })
  score: number;

  @ApiProperty({ description: 'Total number of projects across all cycles' })
  projectsAmount: number;

  @ApiProperty({ description: 'Number of active projects in the current cycle' })
  activeProjects: number;

  @ApiProperty({ description: 'Number of active collaborators' })
  activeCollaborators: number;
}
import { ApiProperty } from '@nestjs/swagger';

export class EvaluationStatsDto {
  @ApiProperty({ description: 'O número total de usuários ativos.' })
  totalActiveUsers?: number;

  @ApiProperty({ description: 'O número total de avaliações esperadas no ciclo.' })
  totalEvaluations: number;

  @ApiProperty({ description: 'O número de avaliações que já foram concluídas.' })
  completedEvaluations: number;

  @ApiProperty({ description: 'O número de avaliações pendentes que ainda estão dentro do prazo.' })
  pendingEvaluations: number;

  @ApiProperty({ description: 'O número de avaliações não concluídas que já passaram do prazo.' })
  overdueEvaluations: number;
}
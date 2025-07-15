import { ApiProperty } from '@nestjs/swagger';

export class BrutalFactsDto {
  @ApiProperty({ description: 'Nome do mentorado' })
  menteeName: string;

  @ApiProperty({ description: 'ID do mentorado' })
  menteeId: string;

  @ApiProperty({ description: 'Nota média da autoavaliação no contexto' })
  selfEvaluationScore: number;

  @ApiProperty({ description: 'Nota média da avaliação dos pares no contexto' })
  peerEvaluationScore: number;

  @ApiProperty({ description: 'Nota média da avaliação do líder no contexto' })
  leaderEvaluationScore: number;

  @ApiProperty({ description: 'Nota final consolidada para o contexto' })
  finalScore: number;

  @ApiProperty({ description: 'Nome do projeto ou contexto da avaliação' })
  projectName: string;

  @ApiProperty({ description: 'ID do projeto ou contexto' })
  projectId: string;

  @ApiProperty({ description: 'Nome do ciclo de avaliação' })
  cycleName: string;

  @ApiProperty({ description: 'ID do ciclo de avaliação' })
  cycleId: string;

  @ApiProperty({ description: 'Briefing gerado pela IA com os "Brutal Facts"' })
  aiBriefing: string;
}
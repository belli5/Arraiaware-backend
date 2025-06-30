import { ApiProperty } from '@nestjs/swagger';

export class EvaluationItem {
  @ApiProperty({ example: 'a1b2-c3d4-e5f6' })
  evaluationId: string; 

  @ApiProperty({ example: 'Ana Beatriz' })
  collaborator: string;
  
  @ApiProperty({ example: 'a1b2-c3d4-e5f6' })
  collaboratorId: string;

  @ApiProperty({ example: 'Desenvolvedor Pleno' })
  department: string;

  @ApiProperty({ example: 'Backend' })
  track: string;

  @ApiProperty({ example: 'Concluído', enum: ['Concluído', 'Pendente', 'Em Atraso'] })
  status: string;

  @ApiProperty({ example: 100 })
  progress: number;

  @ApiProperty({ example: '2025-07-30T23:59:59.000Z' })
  deadline: Date;

  @ApiProperty({ example: '2025-07-15T10:00:00.000Z', nullable: true })
  completedAt?: Date | null;

  @ApiProperty({ example: 'Projeto Phoenix' })
  projectName: string;

  @ApiProperty({ example: 'f6g7-h8i9-j0k1' })
  projectId: string;

  @ApiProperty({ example: 'c2d3-e4f5-g6h7' })
  cycleId: string;  
  
  @ApiProperty({ example: 'Ciclo 2025-1' })
  cyclename: string;
}

export class ManagerDashboardDataDto {
  @ApiProperty({
    description: 'Resumo geral do progresso das avaliações da equipe do gestor.',
  })
  summary: {
    totalCollaborators: number;
    completed: number;
    pending: number;
    overdue: number;
    overallProgress: number;
  };

  @ApiProperty({
    description: 'Lista paginada de avaliações dos colaboradores nos projetos do gestor.',
    type: [EvaluationItem],
  })
  evaluations: EvaluationItem[];

  @ApiProperty({
    description: 'Informações de paginação para a lista de avaliações.',
  })
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}
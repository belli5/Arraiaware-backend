import { ApiProperty } from '@nestjs/swagger';

export class TeamMemberDto {
  @ApiProperty({ description: 'ID do membro da equipe' })
  id: string;

  @ApiProperty({ description: 'Nome do membro da equipe' })
  name: string;

  @ApiProperty({ description: 'Email do membro da equipe' })
  email: string;
}

export class TeamInfoDto {
  @ApiProperty({ description: 'ID do projeto' })
  projectId: string;

  @ApiProperty({ description: 'Nome do projeto' })
  projectName: string;

  @ApiProperty({ description: 'ID do ciclo de avaliação associado ao projeto' })
  cycleId: string;

  @ApiProperty({ description: 'Nome do ciclo de avaliação associado ao projeto' })
  cycleName: string;

  @ApiProperty({ description: 'ID do gestor do projeto' })
  managerId: string;

  @ApiProperty({ description: 'Nome do gestor do projeto' })
  managerName: string;

  @ApiProperty({ type: [TeamMemberDto], description: 'Lista de outros colaboradores no projeto' })
  collaborators: TeamMemberDto[];
}

export class ManagedTeamDto {
  @ApiProperty({ description: 'ID do projeto gerenciado' })
  projectId: string;

  @ApiProperty({ description: 'Nome do projeto gerenciado' })
  projectName: string;

  @ApiProperty({ description: 'ID do ciclo de avaliação do projeto' })
  cycleId: string;

  @ApiProperty({ description: 'Nome do ciclo de avaliação do projeto' })
  cycleName: string;

  @ApiProperty({ type: [TeamMemberDto], description: 'Lista de colaboradores no projeto' })
  collaborators: TeamMemberDto[];
}
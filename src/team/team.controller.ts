import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Roles } from 'src/auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { ManagedTeamDto, TeamInfoDto } from './dto/team-info.dto';
import { TeamService } from './team.service';

@ApiTags('Teams')
@Controller('api/teams')
@UseGuards(JwtAuthGuard) 
@ApiBearerAuth()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('user/:userId/projects')
  @ApiOperation({ summary: 'Obter todos os projetos de um usuário no ciclo ativo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de projetos retornada com sucesso.',
    type: [TeamInfoDto], 
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhum ciclo ativo ou projeto encontrado para o usuário.',
  })
  async getUserProjects(@Param('userId', ParseUUIDPipe) userId: string): Promise<TeamInfoDto[]> {
    return this.teamService.getUserProjectsInCurrentCycle(userId);
  }

  @Get('manager/:managerId')
  @Roles(UserType.ADMIN, UserType.RH, UserType.GESTOR)
  @ApiOperation({ summary: 'Obtém a lista de projetos e seus membros gerenciados por um gestor' })
  @ApiResponse({ status: 200, description: 'Lista de times gerenciados retornada com sucesso.', type: [ManagedTeamDto] })
  @ApiResponse({ status: 404, description: 'Gestor ou projetos não encontrados.' })
  async getTeamByManager(@Param('managerId', ParseUUIDPipe) managerId: string): Promise<ManagedTeamDto[]> {
    return this.teamService.getTeamByManager(managerId);
  }

  @Get('member/:userId/okrs')
  @Roles(UserType.ADMIN, UserType.RH, UserType.GESTOR)
  @ApiOperation({ summary: "Obtém os OKRs de um membro da equipe (visão do líder/mentor)" })
  getMemberOkrs(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.teamService.getMemberOkrs(userId);
  }

  @Get('member/:userId/pdis')
  @Roles(UserType.ADMIN, UserType.RH, UserType.GESTOR)
  @ApiOperation({ summary: "Obtém os PDIs de um membro da equipe (visão do líder/mentor)" })
  getMemberPdis(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.teamService.getMemberPdis(userId);
  }
}
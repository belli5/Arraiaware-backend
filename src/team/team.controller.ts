import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TeamInfoDto, TeamMemberDto } from './dto/team-info.dto'; // Importação correta
import { TeamService } from './team.service';

@ApiTags('Teams')
@Controller('api/teams')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obter o projeto e colegas de equipe de um usuário' })
  @ApiResponse({
    status: 200,
    description: 'Informações da equipe retornadas com sucesso.',
    type: TeamInfoDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Projeto não encontrado para o usuário especificado.',
  })
  async getUserTeam(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<TeamInfoDto> {
    return this.teamService.getUserTeamInfo(userId);
  }

  @Get('manager/:managerId')
  @ApiOperation({ summary: 'Obter os liderados diretos de um gestor' })
  @ApiResponse({
    status: 200,
    description: 'Lista de liderados retornada com sucesso.',
    type: [TeamMemberDto], 
  })
  @ApiResponse({
    status: 404,
    description: 'Gestor não encontrado.',
  })
  async getTeamByManager(
    @Param('managerId', ParseUUIDPipe) managerId: string,
  ): Promise<TeamMemberDto[]> {
    return this.teamService.getTeamByManager(managerId);
  }
}
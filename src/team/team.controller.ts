import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ManagedTeamDto, TeamInfoDto, TeamMemberDto } from './dto/team-info.dto';
import { TeamService } from './team.service';
import { Roles } from 'src/auth/roles.decorator';
import { UserType } from '@prisma/client';

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
  @Roles(UserType.ADMIN, UserType.RH, UserType.GESTOR)
  @ApiOperation({ summary: 'Obtém a lista de projetos e seus membros gerenciados por um gestor' })
  @ApiResponse({ status: 200, description: 'Lista de times gerenciados retornada com sucesso.', type: [ManagedTeamDto] }) // Use o DTO correto aqui
  @ApiResponse({ status: 404, description: 'Gestor ou projetos não encontrados.' })
  async getTeamByManager(@Param('managerId', ParseUUIDPipe) managerId: string): Promise<ManagedTeamDto[]> {
    return this.teamService.getTeamByManager(managerId);
  }
}
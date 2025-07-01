import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TeamInfoDto } from './dto/team-info.dto';
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
}
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GetEvaluationsQueryDto } from '../rh/dto/get-evaluations-query.dto';
import { DashboardService } from './dashboard.service';
import { EvaluationStatsDto } from './dto/evaluation-stats.dto';
import { ManagerDashboardDataDto } from './dto/manager-dashboard.dto';

@ApiTags('Dashboard')
@Controller('api/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('manager/:managerId')
  @Roles(UserType.GESTOR, UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Obtém os dados para o painel de acompanhamento do Gestor' })
  @ApiResponse({ status: 200, description: 'Dados do painel retornados com sucesso.', type: ManagerDashboardDataDto })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Gestor ou ciclo não encontrado.' })
  getManagerDashboard(
    @Param('managerId', ParseUUIDPipe) managerId: string,
    @Query() query: GetEvaluationsQueryDto,
  ): Promise<ManagerDashboardDataDto> {
    return this.dashboardService.getManagerDashboardData(managerId, query);
  }

  @Get('evaluation-stats')
  @Roles(UserType.RH, UserType.ADMIN)
  @ApiOperation({ summary: 'Obtém as estatísticas do ciclo de avaliação.' })
  @ApiQuery({ name: 'cycleId', required: true, description: 'ID do ciclo de avaliação a ser consultado.' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso.', type: EvaluationStatsDto })
  getEvaluationStats(@Query('cycleId') cycleId: string): Promise<EvaluationStatsDto> {
    return this.dashboardService.getEvaluationStats(cycleId);
  }

  @Get('overall-stats')
  @Roles(UserType.RH, UserType.ADMIN)
  @ApiOperation({ summary: 'Obtém as estatísticas consolidadas de TODOS os ciclos de avaliação.' })
  @ApiResponse({ status: 200, description: 'Estatísticas consolidadas retornadas com sucesso.', type: EvaluationStatsDto })
  getOverallEvaluationStats(): Promise<EvaluationStatsDto> {
    return this.dashboardService.getOverallEvaluationStats();
  }
  
  @Get('user-evolution/:userId')
  @ApiOperation({ summary: 'Obtém o histórico de médias de um usuário para o gráfico de evolução' })
  @ApiResponse({ status: 200, description: 'Dados de evolução retornados com sucesso.' })
  getUserEvolution(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.dashboardService.getUserEvolution(userId);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DashboardService } from './dashboard.service';
import { EvaluationStatsDto } from './dto/evaluation-stats.dto';

@ApiTags('Dashboard')
@Controller('api/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('evaluation-stats')
  @Roles(UserType.RH, UserType.ADMIN) 
  @ApiOperation({ summary: 'Obtém as estatísticas do ciclo de avaliação.' })
  @ApiQuery({ name: 'cycleId', required: true, description: 'ID do ciclo de avaliação a ser consultado.' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso.', type: EvaluationStatsDto })
  @ApiResponse({ status: 403, description: 'Acesso negado. Apenas para RH ou Admin.' })
  @ApiResponse({ status: 404, description: 'Ciclo de avaliação não encontrado.' })
  getEvaluationStats(@Query('cycleId') cycleId: string): Promise<EvaluationStatsDto> {
    return this.dashboardService.getEvaluationStats(cycleId);
  }
}
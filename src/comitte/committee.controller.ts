import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CommitteeService } from './committee.service';
import { GetEvaluationsQueryDto } from 'src/rh/dto/get-evaluations-query.dto';
import { UpdateCommitteeEvaluationDto } from './dto/update-committee-evaluation.dto';
import { GetCommitteePanelQueryDto } from './dto/get-committee-panel-query.dto';

@ApiTags('Committee')
@Controller('api/committee')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class CommitteeController {
  constructor(private readonly committeeService: CommitteeService) {}

  @Get('summary/last')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Obter resumo do último ciclo de avaliação cadastrado' })
  @ApiResponse({ status: 200, description: 'Resumo do ciclo retornado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Nenhum ciclo foi encontrado.' })
  async getLastCycleSummary() {
    return this.committeeService.getLastCycleSummary();
  }

  @Get('export/cycle/:cycleId/excel')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Exportar dados de um ciclo específico para Excel' })
  @ApiResponse({ status: 200, description: 'Arquivo Excel gerado e download iniciado.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Ciclo não encontrado.' })
  async exportCycleDataForExcel(
    @Param('cycleId', ParseUUIDPipe) cycleId: string,
    @Res() res: Response,
  ) {
    const { fileName, buffer } = await this.committeeService.exportCycleDataForExcel(
      cycleId,
    );

    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Get('panel')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Painel do comitê para visualizar e editar avaliações concluídas' })
  @ApiResponse({ status: 200, description: 'Dados do painel retornados com sucesso.' })
  getCommitteePanel(@Query() query: GetCommitteePanelQueryDto) { 
    return this.committeeService.getCommitteePanel(query);
  }

  @Patch('panel/:evaluationId')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Atualiza a nota final e observação de uma avaliação pelo comitê' })
  @ApiResponse({ status: 200, description: 'Avaliação atualizada com sucesso.' })
  updateCommitteeEvaluation(
    @Param('evaluationId') evaluationId: string,
    @Body() dto: UpdateCommitteeEvaluationDto,
    @Req() request,
  ) {
    const committeeMemberId = request.user.id;
    return this.committeeService.updateCommitteeEvaluation(evaluationId, dto, committeeMemberId);
  }

  @Get('panel/:evaluationId/summary')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Gera ou obtém o resumo de IA para uma avaliação específica' })
  @ApiResponse({ status: 200, description: 'Resumo retornado com sucesso.' })
  @ApiResponse({ status: 429, description: 'Cota da API de IA excedida.' })
  getAiSummary(@Param('evaluationId') evaluationId: string) {
    return this.committeeService.getSingleAiSummary(evaluationId);
  }
}

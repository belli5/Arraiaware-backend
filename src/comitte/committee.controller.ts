import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User, UserType } from '@prisma/client';
import { Response } from 'express';
import { Audit } from 'src/AuditModule/dto/audit.decorator';
import { TeamMemberDto } from 'src/team/dto/team-info.dto';
import { AssignMentorDto } from 'src/users/dto/assign-mentor.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CommitteeService } from './committee.service';
import { CommitteInsightsInfo } from './dto/committee-insights.dto';
import { GetCommitteePanelQueryDto } from './dto/get-committee-panel-query.dto';
import { UpdateCommitteeEvaluationDto } from './dto/update-committee-evaluation.dto';

@ApiTags('Committee')
@Controller('api/committee')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class CommitteeController {
  constructor(private readonly committeeService: CommitteeService) {}

  @Get('summary/last')
  @Roles(UserType.ADMIN, UserType.COMITE)
  @ApiOperation({ summary: 'Obter resumo do último ciclo de avaliação cadastrado' })
  @ApiResponse({ status: 200, description: 'Resumo do ciclo retornado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Nenhum ciclo foi encontrado.' })
  async getLastCycleSummary() {
    return this.committeeService.getLastCycleSummary();
  }

  @Get('insights')
  @Roles(UserType.ADMIN, UserType.COMITE)
  @ApiOperation({ summary: 'Obter insights de todos os ciclos de avaliação' })
  @ApiResponse({ status: 200, description: 'Insights retornados com sucesso.', type: CommitteInsightsInfo })
  @ApiResponse({ status: 404, description: 'Nenhum ciclo foi encontrado.' })
  async getCommitteInsights(): Promise<CommitteInsightsInfo> {
    return this.committeeService.getCommitteInsights();
  }

  @Get('export/cycle/:cycleId/excel')
  @Roles(UserType.ADMIN, UserType.COMITE)
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
  @Audit('FINALIZE_EQUALIZATION')
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

  @Get('evaluation/:evaluationId/summary')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Obtém (ou gera) o resumo de IA para uma avaliação específica' })
  async getSingleAiSummary(@Param('evaluationId') evaluationId: string, @Req() request) {
    const requestor = request.user as User;
    return this.committeeService.getSingleAiSummary(evaluationId, requestor);
  }
 @Patch('users/:userId/mentor')
  @Roles(UserType.ADMIN, UserType.COMITE)
  @Audit('ASSIGN_MENTOR')
  @ApiOperation({ summary: 'Define o mentor de um usuário' })
  @ApiResponse({ status: 200, description: 'Mentor do usuário atualizado com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado ou o usuário selecionado não pode ser mentor.' })
  @ApiResponse({ status: 404, description: 'Usuário ou mentor não encontrado.' })
  setMentor(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignMentorDto,
  ) {
    return this.committeeService.setMentor(userId, dto.mentorId);
  }

  @Get('mentor/:mentorId/mentees')
  @Roles(UserType.ADMIN, UserType.COMITE)
  @ApiOperation({ summary: "Obtém a lista de mentorados de um mentor" })
  @ApiResponse({ status: 200, description: 'Lista de mentorados retornada com sucesso.', type: [TeamMemberDto] })
  @ApiResponse({ status: 404, description: 'Mentor não encontrado.' })
  async getMenteesByMentor(@Param('mentorId', ParseUUIDPipe) mentorId: string): Promise<TeamMemberDto[]> {
    return this.committeeService.getMenteesByMentor(mentorId);
  }
  @Delete('users/:userId/mentor')
  @Roles(UserType.ADMIN, UserType.COMITE)
  @ApiOperation({ summary: 'Remove o mentor de um usuário' })
  @ApiResponse({ status: 200, description: 'Mentor removido com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  removeMentor(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.committeeService.removeMentor(userId);
  }
}

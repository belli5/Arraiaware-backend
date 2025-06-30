import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SubmitPeerEvaluationDto } from './dto/submit-peer-evaluation.dto';
import { SubmitReferenceIndicationDto } from './dto/submit-reference-indication.dto';
import { SubmitSelfEvaluationDto } from './dto/submit-self-evaluation.dto';
import { EvaluationsService } from './evaluations.service';
import { SubmitLeaderEvaluationDto } from './dto/submit-leader-evaluation.dto';

@ApiTags('Evaluations')
@Controller('api/evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post('self')
  @ApiOperation({ summary: 'Submeter uma autoavaliação' })
  @ApiResponse({ status: 201, description: 'Autoavaliação submetida com sucesso.' })
  submitSelfEvaluation(@Body() dto: SubmitSelfEvaluationDto) {
    return this.evaluationsService.submitSelfEvaluation(dto);
  }

  @Post('peer')
  @ApiOperation({ summary: 'Submeter uma avaliação de par ou líder' })
  @ApiResponse({ status: 201, description: 'Avaliação de par submetida com sucesso.' })
  submitPeerEvaluation(@Body() dto: SubmitPeerEvaluationDto) {
    return this.evaluationsService.submitPeerEvaluation(dto);
  }

  @Post('reference')
  @ApiOperation({ summary: 'Submeter uma indicação de referência' })
  @ApiResponse({ status: 201, description: 'Indicação de referência submetida com sucesso.' })
  submitReferenceIndication(@Body() dto: SubmitReferenceIndicationDto) {
    return this.evaluationsService.submitReferenceIndication(dto);
  }

  @Post('leader') 
  @ApiOperation({ summary: 'Submeter uma avaliação de líder para um liderado' })
  @ApiResponse({ status: 201, description: 'Avaliação de líder submetida com sucesso.' })
  submitLeaderEvaluation(@Body() dto: SubmitLeaderEvaluationDto) {
    return this.evaluationsService.submitLeaderEvaluation(dto);
  }

  @Get('self/:userId')
  @ApiOperation({ summary: 'Buscar a autoavaliação de um usuário' })
  @ApiQuery({ name: 'cycleId', type: 'string', description: 'ID do ciclo de avaliação', required: true })
  @ApiResponse({ status: 404, description: 'Avaliação não encontrada.' })
  findSelfEvaluation(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.evaluationsService.findSelfEvaluation(userId, cycleId);
  }

  @Get('peer/for/:userId')
  @ApiOperation({ summary: 'Buscar avaliações de pares recebidas por um usuário' })
  @ApiQuery({ name: 'cycleId', type: 'string', description: 'ID do ciclo de avaliação', required: true })
  findPeerEvaluationsForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.evaluationsService.findPeerEvaluationsForUser(userId, cycleId);
  }
  
  @Get('reference/for/:userId')
  @ApiOperation({ summary: 'Buscar indicações de referência recebidas por um usuário' })
  @ApiQuery({ name: 'cycleId', type: 'string', description: 'ID do ciclo de avaliação', required: true })
  findReferenceIndicationsForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.evaluationsService.findReferenceIndicationsForUser(userId, cycleId);
  }
  
  @Get('my-status/:userId')
  @ApiOperation({ summary: 'Verificar o status da minha avaliação' })
  @ApiQuery({ name: 'cycleId', type: 'string', required: true })
  getMyStatus(
      @Param('userId', ParseUUIDPipe) userId: string,
      @Query('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
      return this.evaluationsService.getUserStatus(userId, cycleId);
  }
  
  @Get('peer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.RH, UserType.ADMIN)
  @ApiOperation({ summary: 'Listar todas as avaliações de pares (peer evaluations)' })
  @ApiQuery({ name: 'cycleId', required: false, description: 'Opcional. Filtra as avaliações por um ciclo de avaliação específico.' })
  @ApiResponse({ status: 200, description: 'Lista de avaliações de pares retornada com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  findAllPeerEvaluations(@Query('cycleId') cycleId?: string) {
    return this.evaluationsService.findAllPeerEvaluations(cycleId);
  }
  
  @Get('peer/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserType.RH, UserType.ADMIN)
  @ApiOperation({ summary: 'Buscar os detalhes de uma avaliação de par específica' })
  @ApiResponse({ status: 200, description: 'Detalhes da avaliação retornados com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Avaliação não encontrada.' })
  findPeerEvaluationById(@Param('id', ParseUUIDPipe) id: string) {
    return this.evaluationsService. findAllPeerEvaluations(id);
  }
}
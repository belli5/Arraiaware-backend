import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EqualizationResponseDto } from './dto/equalization-response.dto';
import { EqualizationService } from './equalization.service';
import { FinalizeEqualizationDto } from './dto/finalize-equalization.dto';

@ApiTags('RH & Admin', 'Equalization')
@Controller('api/equalization')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class EqualizationController {
  constructor(private readonly equalizationService: EqualizationService) {}

  @Get('consolidated-view/:userId')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Painel de equalização consolidado por colaborador' })
  @ApiQuery({ name: 'cycleId', type: 'string', required: true })
  @ApiResponse({ status: 200, description: 'Visão consolidada retornada com sucesso.', type: EqualizationResponseDto })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Colaborador ou ciclo não encontrado.' })
  getConsolidatedView(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
  ): Promise<EqualizationResponseDto> {
    return this.equalizationService.getConsolidatedView(userId, cycleId);
  }

  @Get('consolidated-view/:userId/summary') 
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Gera um resumo com GenAI da avaliação consolidada' })
  @ApiQuery({ name: 'cycleId', type: 'string', required: true })
  @ApiResponse({ status: 200, description: 'Resumo gerado com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Dados não encontrados para gerar o resumo.' })
  getEqualizationSummary(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
  ): Promise<{ summary: string }> {
    return this.equalizationService.getEqualizationSummary(userId, cycleId);
  }

  @Patch('finalize/:userId')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Finaliza a equalização de um colaborador, salvando notas e observações' })
  @ApiQuery({ name: 'cycleId', type: 'string', required: true })
  @ApiResponse({ status: 200, description: 'Equalização finalizada com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Colaborador ou ciclo não encontrado.' })
  finalizeEqualization(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
    @Req() request, 
    @Body() dto: FinalizeEqualizationDto,
  ) {
    const committeeMemberId = request.user.id; 
    return this.equalizationService.finalizeEqualization(userId, cycleId, committeeMemberId, dto);
  }
}
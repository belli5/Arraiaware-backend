import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EqualizationResponseDto } from './dto/equalization-response.dto';
import { EqualizationService } from './equalization.service';
import { FinalizeEqualizationDto } from './dto/finalize-equalization.dto';
import { Response } from 'express';
import { PdfService } from '../pdf/pdf.service';

@ApiTags('RH & Admin', 'Equalization')
@Controller('api/equalization')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class EqualizationController {
  constructor(private readonly equalizationService: EqualizationService, private readonly pdfService: PdfService, ) {}

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
  @ApiOperation({ summary: 'Gera um resumo com GenAI e o envia por email para o solicitante' })
  @ApiQuery({ name: 'cycleId', type: 'string', required: true })
  @ApiResponse({ status: 200, description: 'Resumo gerado e email enviado com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Dados não encontrados para gerar o resumo.' })
  getEqualizationSummary(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
    @Req() request, 
  ): Promise<{ summary: string }> {
    const requestor = request.user; 
    return this.equalizationService.getEqualizationSummary(userId, cycleId, requestor);
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

  @Get('consolidated-view/:userId/export')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Exporta a visão consolidada de um colaborador para PDF' })
  @ApiQuery({ name: 'cycleId', type: 'string', required: true })
  @ApiResponse({ status: 200, description: 'Relatório em PDF gerado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Colaborador ou ciclo não encontrado.' })
  async exportConsolidatedView(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('cycleId', ParseUUIDPipe) cycleId: string,
    @Res() res: Response,
  ) {
    const consolidatedData = await this.equalizationService.getConsolidatedView(userId, cycleId);
   
    const htmlContent = this.equalizationService.generateEqualizationReportHtml(consolidatedData);

    const pdfBuffer = await this.pdfService.createPdfFromHtml(htmlContent);

    const collaboratorNameSanitized = consolidatedData.collaboratorName.replace(/\s/g, '_');
    const cycleNameSanitized = consolidatedData.cycleName.replace(/\s/g, '_');
    const filename = `Relatorio_${collaboratorNameSanitized}_${cycleNameSanitized}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdfBuffer);
  }
}
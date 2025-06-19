import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RhService } from './rh.service';
import { GetEvaluationsQueryDto } from './dto/get-evaluations-query.dto';
import { ImportHistoryDto } from './dto/import-history.dto';

@ApiTags('RH & Admin')
@Controller('api/rh')
export class RhController {
  constructor(private readonly rhService: RhService) {}

  @Get('status-overview')
  @ApiOperation({ summary: 'Painel de acompanhamento de status das avaliações' })
  @ApiQuery({ name: 'cycleId', type: 'string', required: true })
  @ApiResponse({ status: 200, description: 'Relatório de status gerado com sucesso.' })
  getGlobalStatus(@Query('cycleId', ParseUUIDPipe) cycleId: string) {
    return this.rhService.getGlobalStatus(cycleId);
    
  }
  @Get('export/cycle/:cycleId')
  @ApiOperation({ summary: 'Exportar todos os dados de um ciclo para o comitê' })
  exportCycleData(@Param('cycleId', ParseUUIDPipe) cycleId: string) {
      return this.rhService.exportCycleData(cycleId);
  }

  @Get('evaluations')
  @ApiOperation({
    summary: 'Busca a lista paginada de todas as avaliações em andamento',
    description: 'Permite filtrar por nome, status e departamento, com paginação.',
  })

  @ApiResponse({ status: 200, description: 'Lista de avaliações retornada com sucesso.'})
  getPaginatedEvaluations(@Query() queryDto: GetEvaluationsQueryDto) {
    return this.rhService.findPaginatedEvaluations(queryDto);
  }

  @Post('import/history')
  @ApiOperation({ summary: 'Importar dados históricos de avaliações' })
  @ApiResponse({ status: 201, description: 'Dados históricos importados com sucesso.'})
  importHistory(@Body() importDto: ImportHistoryDto) {
    return this.rhService.importHistory(importDto);
  }
}
import { Controller, Get, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RhService } from './rh.service';

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
}
import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CommitteeService } from './committee.service';

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
}

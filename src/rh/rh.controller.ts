import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GetEvaluationsQueryDto } from './dto/get-evaluations-query.dto';
import { RhService } from './rh.service';

@ApiTags('RH & Admin')
@Controller('api/rh')
@UseGuards(RolesGuard)
export class RhController {
  constructor(private readonly rhService: RhService) {}

  @Get('status-overview')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Painel de acompanhamento de status das avaliações' })
  @ApiQuery({ name: 'cycleId', type: 'string', required: true })
  @ApiResponse({ status: 200, description: 'Relatório de status gerado com sucesso.' })
  getGlobalStatus(@Query('cycleId', ParseUUIDPipe) cycleId: string) {
    return this.rhService.getGlobalStatus(cycleId);
  }

  @Get('export/cycle/:cycleId')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Exportar todos os dados de um ciclo para o comitê' })
  exportCycleData(@Param('cycleId', ParseUUIDPipe) cycleId: string) {
      return this.rhService.exportCycleData(cycleId);
  }

  @Get('evaluations')
  @Roles(UserType.ADMIN, UserType.RH, UserType.GESTOR)
  @ApiOperation({
    summary: 'Busca a lista paginada de todas as avaliações em andamento',
    description: 'Permite filtrar por nome, status e departamento, com paginação.',
  })
  @ApiResponse({ status: 200, description: 'Lista de avaliações retornada com sucesso.'})
  getPaginatedEvaluations(@Query() queryDto: GetEvaluationsQueryDto) {
    return this.rhService.findPaginatedEvaluations(queryDto);
  }

  @Post('import/users/batch')
  @Roles(UserType.ADMIN, UserType.RH)
  @UseInterceptors(FilesInterceptor('files', 20))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar usuários de um ou mais arquivos XLSX' })
  @ApiResponse({ status: 201, description: 'Usuários importados com sucesso.' })
  @ApiBody({
    description: 'Um ou mais arquivos XLSX contendo os dados dos usuários',
    required: true,
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  importUsersBatch(@UploadedFiles() files: Array<Express.Multer.File>) {
    return this.rhService.importUsersFromMultipleXlsx(files);
  }

  @Post('import/history/batch')
  @Roles(UserType.ADMIN, UserType.RH)
  @UseInterceptors(FilesInterceptor('files', 20))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar histórico de avaliações de um ou mais arquivos XLSX' })
  @ApiResponse({ status: 201, description: 'Histórico importado com sucesso.' })
  @ApiBody({
    description: 'Um ou mais ficheiros XLSX contendo o histórico de avaliações.',
    required: true,
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  importHistoryBatch(@UploadedFiles() files: Array<Express.Multer.File>) {
    return this.rhService.importHistoryFromMultipleXlsx(files);
  }
}
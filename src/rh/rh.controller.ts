import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RhService } from './rh.service';
import { GetEvaluationsQueryDto } from './dto/get-evaluations-query.dto';
import { ImportHistoryDto } from './dto/import-history.dto';
import { ImportUsersDto } from './dto/import-users.dto';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @Post('import/users')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data') // Este decorador indica que o endpoint aceita dados de formulário com arquivos
  @ApiOperation({ summary: 'Importar e criar uma lista de usuários a partir de um arquivo XLSX' })
  @ApiResponse({ status: 201, description: 'Usuários importados com sucesso.' })
  // 2. Adicione o decorador ApiBody aqui
  @ApiBody({
    description: 'Arquivo XLSX contendo os dados dos usuários (colunas: name, email, unidade)',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary', // O formato 'binary' instrui o Swagger a exibir um botão de upload de arquivo
        },
      },
    },
  })
  importUsers(@UploadedFile() file: Express.Multer.File) {
    // A lógica do serviço para processar o arquivo permanece a mesma
    return this.rhService.importUsersFromXlsx(file);
  }
}
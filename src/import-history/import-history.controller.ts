import { Controller, Delete, Get, Logger, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ImportHistoryService } from './import-history.service';

@ApiTags('Importação')
@Controller('api/import-history')
export class ImportHistoryController {
  private readonly logger = new Logger(ImportHistoryController.name);

  constructor(private readonly importHistoryService: ImportHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Listar o histórico de importações' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso.' })
  findAll() {
    this.logger.log("Requisição recebida para listar todo o histórico.");
    return this.importHistoryService.findAll();
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Baixar um arquivo do histórico de importação' })
  @ApiResponse({ status: 200, description: 'Download iniciado.' })
  @ApiResponse({ status: 404, description: 'Arquivo não encontrado.' })
  // Removido o ParseUUIDPipe para aceitar o formato CUID do Prisma
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    this.logger.log(`Requisição de download para o ID: ${id}`);
    try {
      const file = await this.importHistoryService.downloadFile(id);
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(file.fileContent);
    } catch (error) {
      this.logger.error(`Falha no download para o ID ${id}: ${error.message}`);
      throw new NotFoundException(error.message);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar um registro do histórico de importação' })
  @ApiResponse({ status: 200, description: 'Registro deletado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Registro não encontrado.' })

  remove(@Param('id') id: string) {
    this.logger.log(`Requisição para deletar o histórico com ID: ${id}`);
    return this.importHistoryService.remove(id);
  }
}

// Em: src/import-history/import-history.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImportHistoryService {
  // Adiciona um Logger para esta classe, que aparecerá no console com o prefixo [ImportHistoryService]
  private readonly logger = new Logger(ImportHistoryService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    this.logger.log('>>> Endpoint GET /api/import-history CHAMADO');
    this.logger.log('Buscando todos os registros na tabela ImportHistory...');
    try {
      const history = await this.prisma.importHistory.findMany({
        select: {
          id: true,
          fileName: true,
          importDate: true,
          status: true,
        },
        orderBy: {
          importDate: 'desc',
        },
      });
      this.logger.log(`Consulta ao banco de dados bem-sucedida. Encontrados ${history.length} registros.`);
      if (history.length === 0) {
        this.logger.warn('Nenhum registro de histórico foi encontrado no banco de dados.');
      }
      return history;
    } catch (error) {
      this.logger.error('!!! Erro ao buscar o histórico no banco de dados !!!', error.stack);
      throw error;
    }
  }

  async downloadFile(id: string) {
    this.logger.log(`>>> Endpoint GET /api/import-history/${id}/download CHAMADO`);
    this.logger.log(`Tentando baixar arquivo do histórico com ID: ${id}`);
    const historyEntry = await this.prisma.importHistory.findUnique({
      where: { id },
    });

    if (!historyEntry || !historyEntry.file) {
      this.logger.error(`Arquivo com ID ${id} não foi encontrado ou o campo 'file' está vazio.`);
      throw new NotFoundException(`Arquivo com ID ${id} não encontrado ou está vazio.`);
    }

    this.logger.log(`Arquivo ${historyEntry.fileName} (ID: ${id}) encontrado e pronto para download.`);
    return {
      fileName: historyEntry.fileName,
      fileContent: historyEntry.file,
    };
  }

  async remove(id: string) {
    this.logger.log(`>>> Endpoint DELETE /api/import-history/${id} CHAMADO`);
    this.logger.log(`Tentando deletar registro do histórico com ID: ${id}`);
    const historyEntry = await this.prisma.importHistory.findUnique({
      where: { id },
    });

    if (!historyEntry) {
      this.logger.error(`Registro de histórico com ID ${id} não encontrado para deleção.`);
      throw new NotFoundException(`Registro de histórico com ID ${id} não encontrado.`);
    }

    await this.prisma.importHistory.delete({
      where: { id },
    });

    this.logger.log(`Registro ${id} deletado com sucesso do banco de dados.`);
    return { message: `Registro ${id} deletado com sucesso.` };
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommitteeService {
  constructor(private prisma: PrismaService) {}

  async exportCycleDataForExcel(cycleId: string) {
    const cycle = await this.prisma.evaluationCycle.findUnique({
      where: { id: cycleId },
    });
    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${cycleId} não encontrado.`);
    }

    const [selfEvaluations, leaderEvaluations, peerEvaluations] =
      await Promise.all([
        this.prisma.selfEvaluation.findMany({
          where: { cycleId },
          include: { user: true, criterion: true },
        }),
        this.prisma.leaderEvaluation.findMany({
          where: { cycleId },
          include: { collaborator: true, leader: true, criterion: true },
        }),
        this.prisma.peerEvaluation.findMany({
          where: { cycleId },
          include: {
            evaluatedUser: true,
            evaluatorUser: true,
            Project: true,
          },
        }),
      ]);

    const flatData = [];

    selfEvaluations.forEach((ev) => {
      flatData.push({
        'ID Colaborador': ev.userId,
        'Nome Colaborador': ev.user.name,
        'Email Colaborador': ev.user.email,
        'Tipo de Avaliação': 'Autoavaliação',
        'Avaliador': ev.user.name,
        'Critério': ev.criterion.criterionName,
        'Pilar': ev.criterion.pillar,
        'Nota (1-5)': ev.score,
        'Justificativa': ev.justification,
        'Nota Geral (Pares)': null,
        'Pontos a Melhorar (Pares)': null,
        'Pontos a Explorar (Pares)': null,
        'Projeto (Pares)': null,
      });
    });

    leaderEvaluations.forEach((ev) => {
      flatData.push({
        'ID Colaborador': ev.collaboratorId,
        'Nome Colaborador': ev.collaborator.name,
        'Email Colaborador': ev.collaborator.email,
        'Tipo de Avaliação': 'Avaliação do Líder',
        'Avaliador': ev.leader.name,
        'Critério': ev.criterion.criterionName,
        'Pilar': ev.criterion.pillar,
        'Nota (1-5)': ev.score,
        'Justificativa': ev.justification,
        'Nota Geral (Pares)': null,
        'Pontos a Melhorar (Pares)': null,
        'Pontos a Explorar (Pares)': null,
        'Projeto (Pares)': null,
      });
    });

    peerEvaluations.forEach((ev) => {
      flatData.push({
        'ID Colaborador': ev.evaluatedUserId,
        'Nome Colaborador': ev.evaluatedUser?.name || 'N/A',
        'Email Colaborador': ev.evaluatedUser?.email || 'N/A',
        'Tipo de Avaliação': 'Avaliação de Pares (360)',
        'Avaliador': ev.evaluatorUser.name,
        'Critério': null,
        'Pilar': null,
        'Nota (1-5)': null,
        'Justificativa': null,
        'Nota Geral (Pares)': ev.generalScore,
        'Pontos a Melhorar (Pares)': ev.pointsToImprove,
        'Pontos a Explorar (Pares)': ev.pointsToExplore,
        'Projeto (Pares)': ev.Project?.name || 'N/A',
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Avaliacoes Consolidadas');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return {
      fileName: `export_avaliacoes_${cycle.name.replace(/\s/g, '_')}.xlsx`,
      buffer: buffer,
    };
  }
}

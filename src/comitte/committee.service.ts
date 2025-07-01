import { Injectable, NotFoundException } from '@nestjs/common';
import {
  EvaluationCriterion,
  LeaderEvaluation,
  PeerEvaluation,
  Project,
  SelfEvaluation,
  User,
} from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

export interface CommitteeSummary {
  readyEvaluations: number;
  overallAverage: number;
  totalCollaborators: number;
  pendingEvaluations: number;
}

@Injectable()
export class CommitteeService {
  constructor(private prisma: PrismaService) {}

  private async getLastCycleId(): Promise<string> {
    const lastCycle = await this.prisma.evaluationCycle.findFirst({
      orderBy: { startDate: 'desc' },
      select: { id: true },
      
    });
    console.log('CONSULTANDO RESUMO PARA O CYCLE ID:',  lastCycle?.id);
    if (!lastCycle) {
      throw new NotFoundException('Nenhum ciclo de avaliação foi encontrado.');
    }
    return lastCycle.id;
  }

  async getLastCycleSummary(): Promise<CommitteeSummary> {
    const cycleId = await this.getLastCycleId();

    const [
      totalCollaborators,
      leaderEvaluations,
      selfEvaluations,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { isActive: true, userType: 'COLABORADOR' },
      }),
      this.prisma.leaderEvaluation.findMany({
        where: { cycleId, submissionStatus: 'Concluída' },
        select: { score: true },
      }),
      this.prisma.selfEvaluation.findMany({
        where: { cycleId },
        select: { userId: true, submissionStatus: true },
      }),
    ]);

    const totalScore = leaderEvaluations.reduce((sum, ev) => sum + ev.score, 0);
    const overallAverage = leaderEvaluations.length > 0 ? parseFloat((totalScore / leaderEvaluations.length).toFixed(2)) : 0;

    const completedUserIds = new Set(
      selfEvaluations
        .filter(ev => ev.submissionStatus === 'Concluída')
        .map(ev => ev.userId)
    );
    const readyEvaluations = completedUserIds.size;
    const pendingEvaluations = totalCollaborators - readyEvaluations;

    return {
      totalCollaborators,
      readyEvaluations,
      pendingEvaluations: pendingEvaluations < 0 ? 0 : pendingEvaluations,
      overallAverage,
    };
  }

  async exportCycleDataForExcel(cycleId: string): Promise<{ fileName: string, buffer: Buffer }> {
    const cycle = await this.prisma.evaluationCycle.findUnique({
      where: { id: cycleId },
    });
    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${cycleId} não encontrado.`);
    }

    const [selfEvaluations, leaderEvaluations, peerEvaluations] =
      await Promise.all([
        this.prisma.selfEvaluation.findMany({
          where: { cycleId, submissionStatus: 'Concluída' },
          include: { user: true, criterion: true },
        }),
        this.prisma.leaderEvaluation.findMany({
          where: { cycleId, submissionStatus: 'Concluída' },
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

    const consolidatedData = new Map<string, any>();

    const getOrCreateCollaboratorEntry = (user: { id: string; name: string; email: string; }) => {
      if (!consolidatedData.has(user.id)) {
        consolidatedData.set(user.id, {
          'Nome Colaborador': user.name,
          'Email Colaborador': user.email,
        });
      }
      return consolidatedData.get(user.id);
    };

    (selfEvaluations as (SelfEvaluation & { user: User; criterion: EvaluationCriterion; })[]).forEach((ev) => {
      const entry = getOrCreateCollaboratorEntry(ev.user);
      entry[`Autoavaliação - ${ev.criterion.criterionName}`] = ev.score;
      entry['Autoavaliação - Justificativas'] =
        `${entry['Autoavaliação - Justificativas'] || ''}${ev.criterion.criterionName}: ${ev.justification}\n`;
    });

    (leaderEvaluations as (LeaderEvaluation & { collaborator: User; leader: User; criterion: EvaluationCriterion; })[]).forEach((ev) => {
      const entry = getOrCreateCollaboratorEntry(ev.collaborator);
      entry[`Avaliação do Líder - ${ev.criterion.criterionName}`] = ev.score;
      entry['Avaliação do Líder - Justificativas'] =
        `${entry['Avaliação do Líder - Justificativas'] || ''}${ev.criterion.criterionName}: ${ev.justification}\n`;
    });

    const peerAggregations = (peerEvaluations as (PeerEvaluation & { evaluatedUser: User | null; evaluatorUser: User; Project: Project | null; })[]).reduce((acc, ev) => {
      if (!ev.evaluatedUser) return acc;
      const evaluatedId = ev.evaluatedUser.id;
      if (!acc[evaluatedId]) {
        acc[evaluatedId] = {
          scores: [],
          pointsToImprove: [],
          pointsToExplore: [],
          user: ev.evaluatedUser,
        };
      }
      acc[evaluatedId].scores.push(ev.generalScore);
      acc[evaluatedId].pointsToImprove.push(`- ${ev.pointsToImprove} (Avaliador: ${ev.evaluatorUser.name})`);
      acc[evaluatedId].pointsToExplore.push(`- ${ev.pointsToExplore} (Avaliador: ${ev.evaluatorUser.name})`);
      return acc;
    }, {} as Record<string, any>);

    Object.values(peerAggregations).forEach((agg: any) => {
      const entry = getOrCreateCollaboratorEntry(agg.user);
      const averageScore = agg.scores.length > 0 ? agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length : 0;
      entry['Média Geral (Pares)'] = parseFloat(averageScore.toFixed(2));
      entry['Pontos a Melhorar (Pares)'] = agg.pointsToImprove.join('\n');
      entry['Pontos a Explorar (Pares)'] = agg.pointsToExplore.join('\n');
    });

    const finalDataForExcel = Array.from(consolidatedData.values());
    if (finalDataForExcel.length === 0) {
      return { fileName: `nenhuma_avaliacao_Concluida.xlsx`, buffer: Buffer.from('') };
    }

    const worksheet = XLSX.utils.json_to_sheet(finalDataForExcel);

    if (worksheet['!ref']) {
      worksheet['!autofilter'] = { ref: worksheet['!ref'] };
    }
    
    const columnWidths = Object.keys(finalDataForExcel[0] || {}).map(key => {
      let maxWidth = 40;
      const minWidth = key.length + 2;
      const contentWidth = finalDataForExcel.reduce((w, r) => Math.max(w, (r[key] || "").toString().length), 0);
      const finalWidth = Math.min(maxWidth, Math.max(minWidth, contentWidth + 2));
      return { wch: finalWidth };
    });
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Avaliacoes Consolidadas');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
    return {
      fileName: `export_avaliacoes_${cycle.name.replace(/\s/g, '_')}.xlsx`,
      buffer: buffer,
    };
  }
}

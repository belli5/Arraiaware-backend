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

type SelfEvaluationWithRelations = SelfEvaluation & { user: User; criterion: EvaluationCriterion; };
type LeaderEvaluationWithRelations = LeaderEvaluation & { collaborator: User; leader: User; criterion: EvaluationCriterion; };
type PeerEvaluationWithRelations = PeerEvaluation & { evaluatedUser: User | null; evaluatorUser: User; Project: Project | null; };

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
          where: { cycleId, submissionStatus: 'CONCLUIDA' },
          include: { user: true, criterion: true },
        }),
        this.prisma.leaderEvaluation.findMany({
          where: { cycleId, submissionStatus: 'CONCLUIDA' },
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

    (selfEvaluations as SelfEvaluationWithRelations[]).forEach((ev) => {
      const entry = getOrCreateCollaboratorEntry(ev.user);
      entry[`Autoavaliação - ${ev.criterion.criterionName}`] = ev.score;
      entry['Autoavaliação - Justificativas'] =
        `${entry['Autoavaliação - Justificativas'] || ''}${ev.criterion.criterionName}: ${ev.justification}\n`;
    });

    (leaderEvaluations as LeaderEvaluationWithRelations[]).forEach((ev) => {
      const entry = getOrCreateCollaboratorEntry(ev.collaborator);
      entry[`Avaliação do Líder - ${ev.criterion.criterionName}`] = ev.score;
      entry['Avaliação do Líder - Justificativas'] =
        `${entry['Avaliação do Líder - Justificativas'] || ''}${ev.criterion.criterionName}: ${ev.justification}\n`;
    });

    const peerAggregations = (peerEvaluations as PeerEvaluationWithRelations[]).reduce((acc, ev) => {
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
      const averageScore = agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length;

      entry['Média Geral (Pares)'] = parseFloat(averageScore.toFixed(2));
      entry['Pontos a Melhorar (Pares)'] = agg.pointsToImprove.join('\n');
      entry['Pontos a Explorar (Pares)'] = agg.pointsToExplore.join('\n');
    });

    const finalDataForExcel = Array.from(consolidatedData.values());
    if (finalDataForExcel.length === 0) {
      return { fileName: `nenhuma_avaliacao_concluida.xlsx`, buffer: Buffer.from('') };
    }

    const worksheet = XLSX.utils.json_to_sheet(finalDataForExcel);

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

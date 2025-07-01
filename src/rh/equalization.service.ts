import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsolidatedCriterionDto } from './dto/consolidated-criterion.dto';
import { EqualizationResponseDto, ReferenceFeedbackSummaryDto } from './dto/equalization-response.dto';
import { GenAIService } from 'src/gen-ai/gen-ai.service';
import { PeerFeedbackSummaryDto } from './dto/equalization-response.dto';


@Injectable()
export class EqualizationService {
  constructor(private prisma: PrismaService, private genAIService: GenAIService,) {}


  async getConsolidatedView(userId: string, cycleId: string): Promise<EqualizationResponseDto> {
    const collaborator = await this.prisma.user.findUnique({ where: { id: userId } });
    const cycle = await this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } });


    if (!collaborator || !cycle) {
      throw new NotFoundException('Colaborador ou Ciclo de Avaliação não encontrado.');
    }


    const [selfEvaluations, leaderEvaluations, peerEvaluations, referenceIndications, allCriteria] = await Promise.all([
      this.prisma.selfEvaluation.findMany({ where: { userId, cycleId }, include: { criterion: true } }),
      this.prisma.leaderEvaluation.findMany({ where: { collaboratorId: userId, cycleId }, include: { criterion: true } }),
      this.prisma.peerEvaluation.findMany({ 
        where: { evaluatedUserId: userId, cycleId },
        include: { evaluatorUser: { select: { name: true } } },
      }),
      this.prisma.referenceIndication.findMany({ 
        where: { indicatorUserId: userId, cycleId },
        include: { indicatedUser: { select: { name: true } } },
      }),
      this.prisma.evaluationCriterion.findMany(),
    ]);
   

    const peerFeedbacks: PeerFeedbackSummaryDto[] = peerEvaluations.map(p => ({
      evaluatorName: p.evaluatorUser?.name ?? 'Anônimo',
      pointsToImprove: p.pointsToImprove,
      pointsToExplore: p.pointsToExplore,
    }));



    const referenceFeedbacks: ReferenceFeedbackSummaryDto[] = referenceIndications.map(r => ({
      indicatedName: r.indicatedUser?.name ?? 'Anônimo',
      justification: r.justification,
    }));
   
    const peerAverageScore = peerEvaluations.length > 0
      ? peerEvaluations.reduce((sum, ev) => sum + ev.generalScore, 0) / peerEvaluations.length
      : null;


    const consolidatedCriteria = allCriteria.map((criterion): ConsolidatedCriterionDto => {
      const selfEval = selfEvaluations.find(e => e.criterionId === criterion.id);
      const leaderEval = leaderEvaluations.find(e => e.criterionId === criterion.id);


      const scores = [
        selfEval?.score,
        leaderEval?.score,
        peerAverageScore,
      ].filter((s): s is number => s !== null && s !== undefined);
     
      const hasDiscrepancy = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) >= 2 : false;


      return {
        criterionId: criterion.id,
        criterionName: criterion.criterionName,
        selfEvaluation: selfEval ? { score: selfEval.score, justification: selfEval.justification } : undefined,
        leaderEvaluation: leaderEval ? { score: leaderEval.score, justification: leaderEval.justification } : undefined,
        peerEvaluation: peerAverageScore !== null ? { score: parseFloat(peerAverageScore.toFixed(2)), justification: `Média de ${peerEvaluations.length} avaliações de pares.` } : undefined,
        hasDiscrepancy,
      };
    });


    return {
      collaboratorId: userId,
      collaboratorName: collaborator.name,
      cycleId: cycleId,
      cycleName: cycle.name,
      consolidatedCriteria,
      peerFeedbacks,
      referenceFeedbacks,
    };
  }


  async getEqualizationSummary(userId: string, cycleId: string): Promise<{ summary: string }> {
    const consolidatedData = await this.getConsolidatedView(userId, cycleId);
    if (!consolidatedData) {
      throw new NotFoundException('Não foi possível gerar o resumo pois os dados consolidados não foram encontrados.');
    }


    const summary = await this.genAIService.generateEqualizationSummary(consolidatedData);
    return { summary };
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsolidatedCriterionDto } from './dto/consolidated-criterion.dto';
import { EqualizationResponseDto } from './dto/equalization-response.dto';

@Injectable()
export class EqualizationService {
  constructor(private prisma: PrismaService) {}

  async getConsolidatedView(userId: string, cycleId: string): Promise<EqualizationResponseDto> {
    const collaborator = await this.prisma.user.findUnique({ where: { id: userId } });
    const cycle = await this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } });

    if (!collaborator || !cycle) {
      throw new NotFoundException('Colaborador ou Ciclo de Avaliação não encontrado.');
    }

    const [selfEvaluations, leaderEvaluations, peerEvaluations, allCriteria] = await Promise.all([
      this.prisma.selfEvaluation.findMany({ where: { userId, cycleId }, include: { criterion: true } }),
      
      this.prisma.leaderEvaluation.findMany({ where: { collaboratorId: userId, cycleId }, include: { criterion: true } }),
      
      this.prisma.peerEvaluation.findMany({ where: { evaluatedUserId: userId, cycleId } }),
      this.prisma.evaluationCriterion.findMany(),
    ]);

    const peerAverageScore = peerEvaluations.length > 0
      ? parseFloat((peerEvaluations.reduce((sum, ev) => sum + ev.generalScore, 0) / peerEvaluations.length).toFixed(2))
      : null;

    const consolidatedCriteria = allCriteria.map((criterion): ConsolidatedCriterionDto => {
      const selfEval = selfEvaluations.find(e => e.criterionId === criterion.id);
      const leaderEval = leaderEvaluations.find(e => e.criterionId === criterion.id);

      const scores = [
        selfEval?.score,
        leaderEval?.score,
      ].filter((s): s is number => s !== null && s !== undefined && s > 0);
      
      const hasDiscrepancy = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) >= 2 : false;

      return {
        criterionId: criterion.id,
        criterionName: criterion.criterionName,
        selfEvaluation: selfEval ? { score: selfEval.score, justification: selfEval.justification } : undefined,
        leaderEvaluation: leaderEval ? { score: leaderEval.score, justification: leaderEval.justification } : undefined,
        hasDiscrepancy,
      };
    });

    return {
      collaboratorId: userId,
      collaboratorName: collaborator.name,
      cycleId: cycleId,
      cycleName: cycle.name,
      peerAverageScore: peerAverageScore,
      consolidatedCriteria,
    };
  }
}

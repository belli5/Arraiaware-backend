import { Injectable, NotFoundException } from '@nestjs/common';
import { GenAIService } from '../gen-ai/gen-ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { BrutalFactsDto } from './dto/brutal-facts.dto';

@Injectable()
export class BrutalFactsService {
  constructor(
    private prisma: PrismaService,
    private genAIService: GenAIService,
  ) {}

  async generateBrutalFacts(
    userId: string,
    cycleId: string,
  ): Promise<BrutalFactsDto[]> {
    const [user, cycle] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } }),
    ]);

    if (!user || !cycle) {
      throw new NotFoundException('Usuário ou Ciclo de Avaliação não encontrado.');
    }

    const [selfEvaluations, peerEvaluations, leaderEvaluation] =
      await Promise.all([
        this.prisma.selfEvaluation.findMany({ where: { userId, cycleId } }),
        this.prisma.peerEvaluation.findMany({ where: { evaluatedUserId: userId, cycleId } }),
        this.prisma.leaderEvaluation.findFirst({ where: { collaboratorId: userId, cycleId } }),
      ]);


    const selfScore =
      selfEvaluations.length > 0
        ? selfEvaluations.reduce((sum, ev) => sum + ev.score, 0) / selfEvaluations.length
        : 0;
    const peerScore =
      peerEvaluations.length > 0
        ? peerEvaluations.reduce((sum, ev) => sum + ev.generalScore, 0) / peerEvaluations.length
        : 0;
    const leaderScore = leaderEvaluation
      ? (leaderEvaluation.deliveryScore +
          leaderEvaluation.proactivityScore +
          leaderEvaluation.collaborationScore +
          leaderEvaluation.skillScore) / 4
      : 0;

    const finalScore = (selfScore + peerScore + leaderScore) / 3;

    const contextProjectId = 'geral';
    const contextProjectName = 'Avaliação Geral';


    const dataForAI = {
      collaboratorName: user.name,
      cycleName: cycle.name,
      selfEvaluationScore: selfScore,
      peerEvaluationScore: peerScore,
      leaderEvaluationScore: leaderScore,
    };
   


    const aiBriefing = await this.genAIService.extractBrutalFacts(dataForAI as any);

    const brutalFact: BrutalFactsDto = {
      menteeName: user.name,
      menteeId: user.id,
      selfEvaluationScore: parseFloat(selfScore.toFixed(2)),
      peerEvaluationScore: parseFloat(peerScore.toFixed(2)),
      leaderEvaluationScore: parseFloat(leaderScore.toFixed(2)),
      finalScore: parseFloat(finalScore.toFixed(2)),
      projectName: contextProjectName,
      projectId: contextProjectId,
      cycleName: cycle.name,
      cycleId: cycle.id,
      aiBriefing: aiBriefing,
    };

    return [brutalFact];
  }
}
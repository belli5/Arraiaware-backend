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

  async generateBrutalFactsForMentees(
    mentorId: string,
    cycleId: string,
  ): Promise<BrutalFactsDto[]> {
    const [mentor, cycle] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: mentorId },
        include: { mentees: true }, // Inclui a lista de mentorados
      }),
      this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } }),
    ]);

    if (!mentor) {
      throw new NotFoundException(`Mentor com ID ${mentorId} não encontrado.`);
    }
    if (!cycle) {
      throw new NotFoundException(`Ciclo de Avaliação com ID ${cycleId} não encontrado.`);
    }
    if (!mentor.mentees || mentor.mentees.length === 0) {
      return []; // Retorna um vetor vazio se o mentor não tiver mentorados
    }

    // Processa todos os mentorados em paralelo
    const allBrutalFacts = await Promise.all(
      mentor.mentees.map(async (mentee) => {
        const [selfEvaluations, peerEvaluations, leaderEvaluation] =
          await Promise.all([
            this.prisma.selfEvaluation.findMany({ where: { userId: mentee.id, cycleId } }),
            this.prisma.peerEvaluation.findMany({ where: { evaluatedUserId: mentee.id, cycleId } }),
            this.prisma.leaderEvaluation.findFirst({ where: { collaboratorId: mentee.id, cycleId } }),
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

        const dataForAI = {
          collaboratorName: mentee.name,
          cycleName: cycle.name,
          selfEvaluationScore: selfScore,
          peerEvaluationScore: peerScore,
          leaderEvaluationScore: leaderScore,
          peerFeedbacks: peerEvaluations,
          leaderEvaluation: leaderEvaluation,
        };

        const aiBriefing = await this.genAIService.extractBrutalFacts(dataForAI as any);

        const brutalFact: BrutalFactsDto = {
          menteeName: mentee.name,
          menteeId: mentee.id,
          selfEvaluationScore: parseFloat(selfScore.toFixed(2)),
          peerEvaluationScore: parseFloat(peerScore.toFixed(2)),
          leaderEvaluationScore: parseFloat(leaderScore.toFixed(2)),
          finalScore: parseFloat(finalScore.toFixed(2)),
          projectName: 'Avaliação Geral do Ciclo',
          projectId: 'geral',
          cycleName: cycle.name,
          cycleId: cycle.id,
          aiBriefing: aiBriefing,
        };

        return brutalFact;
      }),
    );

    return allBrutalFacts;
  }
}
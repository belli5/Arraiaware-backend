import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { GenAIService } from 'src/gen-ai/gen-ai.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConsolidatedCriterionDto } from './dto/consolidated-criterion.dto';
import { EqualizationResponseDto, PeerFeedbackSummaryDto, ReferenceFeedbackSummaryDto } from './dto/equalization-response.dto';
import { FinalizeEqualizationDto } from './dto/finalize-equalization.dto';

@Injectable()
export class EqualizationService {
  private readonly logger = new Logger(EqualizationService.name);

  constructor(
    private prisma: PrismaService,
    private genAIService: GenAIService,
    private notificationsService: NotificationsService,
  ) {}

  async getConsolidatedView(userId: string, cycleId: string): Promise<EqualizationResponseDto> {
    const collaborator = await this.prisma.user.findUnique({ where: { id: userId } });
    const cycle = await this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } });

    if (!collaborator || !cycle) {
      throw new NotFoundException('Colaborador ou Ciclo de Avaliação não encontrado.');
    }

    const [selfEvaluations, leaderEvaluation, peerEvaluations, referenceIndications, allCriteria] = await Promise.all([
      this.prisma.selfEvaluation.findMany({ where: { userId, cycleId }, include: { criterion: true } }),
      this.prisma.leaderEvaluation.findFirst({ where: { collaboratorId: userId, cycleId } }),
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

    const peerAverageScore =
      peerEvaluations.length > 0 ? peerEvaluations.reduce((sum, ev) => sum + ev.generalScore, 0) / peerEvaluations.length : null;

    let leaderAverageScore: number | null = null;
    let leaderJustification: string | null = null;
    if (leaderEvaluation) {
      const sum =
        leaderEvaluation.deliveryScore +
        leaderEvaluation.proactivityScore +
        leaderEvaluation.collaborationScore +
        leaderEvaluation.skillScore;
      leaderAverageScore = sum / 4;
      leaderJustification = leaderEvaluation.justification;
    }

    const consolidatedCriteria = allCriteria.map(
      (criterion): ConsolidatedCriterionDto => {
        const selfEval = selfEvaluations.find(e => e.criterionId === criterion.id);
        const scores = [selfEval?.score, peerAverageScore].filter((s): s is number => s !== null && s !== undefined);
        const hasDiscrepancy = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) >= 2 : false;

        return {
          criterionId: criterion.id,
          criterionName: criterion.criterionName,
          selfEvaluation: selfEval ? { score: selfEval.score, justification: selfEval.justification } : undefined,
          peerEvaluation:
            peerAverageScore !== null
              ? {
                  score: parseFloat(peerAverageScore.toFixed(2)),
                  justification: `Média de ${peerEvaluations.length} avaliações de pares.`,
                }
              : undefined,
          hasDiscrepancy,
        };
      },
    );

    const response: any = {
      collaboratorId: userId,
      collaboratorName: collaborator.name,
      cycleId: cycleId,
      cycleName: cycle.name,
      consolidatedCriteria,
      peerFeedbacks,
      referenceFeedbacks,
    };

    if (leaderAverageScore !== null) {
        response.leaderEvaluation = { score: leaderAverageScore, justification: leaderJustification || '' };
    }

    return response;
  }

  async getEqualizationSummary(userId: string, cycleId: string, requestor: User): Promise<{ summary: string }> {
    const consolidatedData = await this.getConsolidatedView(userId, cycleId);
    if (!consolidatedData) {
      throw new NotFoundException('Não foi possível gerar o resumo pois os dados consolidados não foram encontrados.');
    }

    const summary = await this.genAIService.generateEqualizationSummary(consolidatedData);

    await this.prisma.aISummary.create({
      data: {
        summaryType: 'EQUALIZATION_SUMMARY',
        content: summary,
        collaboratorId: userId,
        cycleId: cycleId,
        generatedById: requestor.id,
      },
    });

    if (requestor && requestor.email) {
      this.logger.log(`Enviando resumo de equalização para o email: ${requestor.email}`);
      await this.notificationsService.sendEqualizationSummaryEmail(
        requestor,
        consolidatedData.collaboratorName,
        consolidatedData.cycleName,
        summary,
      );
    } else {
      this.logger.warn(`Não foi possível enviar o email de resumo. O solicitante não foi encontrado ou não possui email.`);
    }

    return { summary };
  }

  async finalizeEqualization(
    collaboratorId: string,
    cycleId: string,
    committeeMemberId: string,
    dto: FinalizeEqualizationDto,
  ) {
    const { finalizedCriteria, committeeObservation } = dto;

    const [collaborator, cycle, committeeMember, criteriaFromDb] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: collaboratorId }, include: { leader: true } }),
      this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } }),
      this.prisma.user.findUnique({ where: { id: committeeMemberId } }),
      this.prisma.evaluationCriterion.findMany({
        where: { id: { in: finalizedCriteria.map(c => c.criterionId) } },
      }),
    ]);

    if (!collaborator || !cycle) {
      throw new NotFoundException('Colaborador ou Ciclo não encontrado.');
    }
    if (!committeeMember) {
      throw new NotFoundException(`Membro do comitê com ID ${committeeMemberId} não encontrado.`);
    }

    const criteriaIdsFromDb = new Set(criteriaFromDb.map(c => c.id));
    const invalidCriterionIds = finalizedCriteria.map(c => c.criterionId).filter(id => !criteriaIdsFromDb.has(id));

    if (invalidCriterionIds.length > 0) {
      throw new NotFoundException(`Os seguintes critérios não foram encontrados: ${invalidCriterionIds.join(', ')}`);
    }

    const transactionPayload: Prisma.PrismaPromise<any>[] = [];

    if (committeeObservation) {
      transactionPayload.push(
        this.prisma.equalizationLog.create({
          data: {
            changeType: 'Observação',
            observation: committeeObservation,
            changedById: committeeMemberId,
            collaboratorId,
            cycleId,
          },
        }),
      );
    }

    for (const criterion of finalizedCriteria) {
      transactionPayload.push(
        this.prisma.finalizedEvaluation.upsert({
          where: {
            collaboratorId_cycleId_criterionId: {
              collaboratorId,
              cycleId,
              criterionId: criterion.criterionId,
            },
          },
          update: {
            finalScore: criterion.finalScore,
            finalizedById: committeeMemberId,
          },
          create: {
            finalScore: criterion.finalScore,
            collaboratorId,
            cycleId,
            criterionId: criterion.criterionId,
            finalizedById: committeeMemberId,
          },
        }),
      );
    }

    await this.prisma.$transaction(transactionPayload);

    this.logger.log(`[BRUTAL FACTS] Iniciando processo para colaborador: ${collaborator.name}`);
    if (collaborator.leader) {
      this.logger.log(`[BRUTAL FACTS] Mentor/Líder encontrado: ${collaborator.leader.name}`);

      const consolidatedData = await this.getConsolidatedView(collaboratorId, cycleId);
      this.logger.log('[BRUTAL FACTS] Dados consolidados para a IA foram recolhidos.');

      const brutalFacts = await this.genAIService.extractBrutalFacts(consolidatedData);
      this.logger.log(`[BRUTAL FACTS] Texto gerado pela IA: "${brutalFacts.substring(0, 100)}..."`);

      await this.prisma.aISummary.create({
        data: {
          summaryType: 'BRUTAL_FACTS',
          content: brutalFacts,
          collaboratorId: collaboratorId,
          cycleId: cycleId,
          generatedById: committeeMemberId,
        },
      });

      this.logger.log(`[BRUTAL FACTS] A chamar NotificationsService para enviar email para: ${collaborator.leader.email}`);
      await this.notificationsService.sendBrutalFactsToMentor(
        collaborator.leader,
        collaborator,
        brutalFacts,
        cycle.name,
      );
      this.logger.log('[BRUTAL FACTS] Chamada ao NotificationsService concluída.');
    } else {
      this.logger.warn(`[BRUTAL FACTS] Processo abortado. O colaborador ${collaborator.name} não possui um líder/mentor associado.`);
    }

    return { message: `Equalização para o colaborador ${collaborator.name} foi finalizada com sucesso.` };
  }
}
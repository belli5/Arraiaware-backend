import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsolidatedCriterionDto } from './dto/consolidated-criterion.dto';
import { EqualizationResponseDto, ReferenceFeedbackSummaryDto } from './dto/equalization-response.dto';
import { GenAIService } from 'src/gen-ai/gen-ai.service';
import { PeerFeedbackSummaryDto } from './dto/equalization-response.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { FinalizeEqualizationDto } from './dto/finalize-equalization.dto';


@Injectable()
export class EqualizationService {

  private readonly logger = new Logger(EqualizationService.name);

  constructor(private prisma: PrismaService, private genAIService: GenAIService,private notificationsService: NotificationsService,) {}


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

  async finalizeEqualization(
    collaboratorId: string,
    cycleId: string,
    committeeMemberId: string,
    dto: FinalizeEqualizationDto,
  ) {
    const { finalizedCriteria, committeeObservation } = dto;

    const collaborator = await this.prisma.user.findUnique({
      where: { id: collaboratorId },
      include: { leader: true },
    });
    
    const cycle = await this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } });

    if (!collaborator || !cycle) {
      throw new NotFoundException('Colaborador ou Ciclo não encontrado.');
    }

    const transactionPayload = [];

    if (committeeObservation) {
      transactionPayload.push(this.prisma.equalizationLog.create({
        data: {
          changeType: 'Observação',
          observation: committeeObservation,
          changedById: committeeMemberId,
          collaboratorId,
          cycleId,
        },
      }));
    }

    const originalLeaderEvaluations = await this.prisma.leaderEvaluation.findMany({
        where: {
            collaboratorId,
            cycleId,
            criterionId: { in: finalizedCriteria.map(c => c.criterionId) }
        },
        include: {
            criterion: { select: { criterionName: true } }
        }
    });
    const originalLeaderEvalsMap = new Map(originalLeaderEvaluations.map(e => [e.criterionId, e]));

    for (const criterion of finalizedCriteria) {
        const originalEval = originalLeaderEvalsMap.get(criterion.criterionId);
        const originalScore = originalEval?.score;
        const finalScore = criterion.finalScore;

        if (originalScore !== finalScore) {
             transactionPayload.push(this.prisma.equalizationLog.create({
                data: {
                    changeType: 'Nota',
                    criterionName: originalEval?.criterion.criterionName || 'Critério desconhecido',
                    previousValue: originalScore?.toString() ?? 'N/A',
                    newValue: finalScore.toString(),
                    changedById: committeeMemberId,
                    collaboratorId,
                    cycleId,
                }
            }));
        }

        transactionPayload.push(this.prisma.finalizedEvaluation.upsert({
            where: {
                collaboratorId_cycleId_criterionId: {
                    collaboratorId,
                    cycleId,
                    criterionId: criterion.criterionId
                }
            },
            update: {
                finalScore: finalScore,
                finalizedById: committeeMemberId,
            },
            create: {
              finalScore: finalScore,
              collaboratorId,
              cycleId,
              criterionId: criterion.criterionId,
              finalizedById: committeeMemberId,
            },
        }));
    }

    await this.prisma.$transaction(transactionPayload);

    this.logger.log(`[BRUTAL FACTS] Iniciando processo para colaborador: ${collaborator.name}`);
    if (collaborator.leader) {
      this.logger.log(`[BRUTAL FACTS] Mentor/Líder encontrado: ${collaborator.leader.name}`);
      
      const consolidatedData = await this.getConsolidatedView(collaboratorId, cycleId);
      this.logger.log('[BRUTAL FACTS] Dados consolidados para a IA foram recolhidos.');

      const brutalFacts = await this.genAIService.extractBrutalFacts(consolidatedData);
      this.logger.log(`[BRUTAL FACTS] Texto gerado pela IA: "${brutalFacts.substring(0, 100)}..."`);
      
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
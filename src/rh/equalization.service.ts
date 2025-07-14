import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { EncryptionService } from 'src/common/encryption/encryption.service';
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
    private encryptionService: EncryptionService,
  ) {}

  async getConsolidatedView(userId: string, cycleId: string): Promise<EqualizationResponseDto> {
    const collaborator = await this.prisma.user.findUnique({ where: { id: userId } });
    const cycle = await this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } });

    if (!collaborator || !cycle) {
      throw new NotFoundException('Colaborador ou Ciclo de Avaliação não encontrado.');
    }

    const [
        selfEvaluations,
        leaderEvaluation,
        peerEvaluations,
        referenceIndications,
        allCriteria,
        finalizedEvaluations,
        aiSummaryRecord,
        brutalFactsRecord 
    ] = await Promise.all([
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
      this.prisma.finalizedEvaluation.findMany({
        where: { collaboratorId: userId, cycleId },
      }),
      this.prisma.aISummary.findFirst({
        where: {
          collaboratorId: userId,
          cycleId,
          summaryType: 'EQUALIZATION_SUMMARY',
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aISummary.findFirst({
        where: {
            collaboratorId: userId,
            cycleId,
            summaryType: 'BRUTAL_FACTS',
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const peerFeedbacks: PeerFeedbackSummaryDto[] = peerEvaluations.map(p => ({
      evaluatorName: p.evaluatorUser?.name ?? 'Anônimo',
      pointsToImprove: this.encryptionService.decrypt(p.pointsToImprove),
      pointsToExplore: this.encryptionService.decrypt(p.pointsToExplore),
    }));

    const referenceFeedbacks: ReferenceFeedbackSummaryDto[] = referenceIndications.map(r => ({
      indicatedName: r.indicatedUser?.name ?? 'Anônimo',
      justification: this.encryptionService.decrypt(r.justification),
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
      leaderJustification = this.encryptionService.decrypt(leaderEvaluation.justification);
    }

    const consolidatedCriteria = allCriteria.map(
      (criterion): ConsolidatedCriterionDto => {
        const selfEval = selfEvaluations.find(e => e.criterionId === criterion.id);
        const scores = [selfEval?.score, peerAverageScore].filter((s): s is number => s !== null && s !== undefined);
        const hasDiscrepancy = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) >= 2 : false;

        return {
          criterionId: criterion.id,
          criterionName: criterion.criterionName,
          selfEvaluation: selfEval
            ? {
                score: selfEval.score,
                justification: this.encryptionService.decrypt(selfEval.justification),
              }
            : undefined,
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

    const finalizationRecord = finalizedEvaluations.find(
      (ev) => ev.criterionId === 'geral'
    );
    const status = (finalizationRecord && finalizationRecord.finalScore > 0) ? 'Equalizada' : 'Pendente';

    const response: EqualizationResponseDto = {
      collaboratorId: userId,
      collaboratorName: collaborator.name,
      cycleId: cycleId,
      cycleName: cycle.name,
      consolidatedCriteria,
      peerFeedbacks,
      referenceFeedbacks,
      status,
      brutalFacts: brutalFactsRecord ? this.encryptionService.decrypt(brutalFactsRecord.content) : undefined,
      finalScore: finalizationRecord?.finalScore,
    };

    return response;
  }

    async getBrutalFacts(userId: string, cycleId: string): Promise<{ brutalFacts: string | undefined }> {
    const brutalFactsRecord = await this.prisma.aISummary.findFirst({
      where: {
          collaboratorId: userId,
          cycleId,
          summaryType: 'BRUTAL_FACTS',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!brutalFactsRecord) {
      throw new NotFoundException(`Nenhum "Brutal Fact" encontrado para o usuário com ID ${userId} no ciclo ${cycleId}.`);
    }

    return {
      brutalFacts: this.encryptionService.decrypt(brutalFactsRecord.content),
    };
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
        content: this.encryptionService.encrypt(summary),
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
    const { finalScore, committeeObservation } = dto;
  
    const [collaborator, cycle, committeeMember] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: collaboratorId },
        include: { leader: true, mentor: true },
      }),
      this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } }),
      this.prisma.user.findUnique({ where: { id: committeeMemberId } }),
    ]);
  
    if (!collaborator || !cycle) {
      throw new NotFoundException('Colaborador ou Ciclo não encontrado.');
    }
    if (!committeeMember) {
      throw new NotFoundException(`Membro do comitê com ID ${committeeMemberId} não encontrado.`);
    }
  
    const transactionPayload: Prisma.PrismaPromise<any>[] = [];
  
    const criterionId = 'geral'; 
    await this.prisma.evaluationCriterion.upsert({
      where: { id: criterionId },
      update: {},
      create: {
        id: criterionId,
        pillar: 'Comitê',
        criterionName: 'Nota Final do Comitê',
      },
    });
  
    if (committeeObservation) {
      transactionPayload.push(
        this.prisma.equalizationLog.create({
          data: {
            changeType: 'Observação',
            observation: this.encryptionService.encrypt(committeeObservation),
            changedById: committeeMemberId,
            collaboratorId,
            cycleId,
          },
        }),
      );
    }
  
    transactionPayload.push(
      this.prisma.finalizedEvaluation.upsert({
        where: {
          collaboratorId_cycleId_criterionId: {
            collaboratorId,
            cycleId,
            criterionId,
          },
        },
        update: {
          finalScore: finalScore,
          finalizedById: committeeMemberId,
        },
        create: {
          finalScore: finalScore,
          collaboratorId,
          cycleId,
          criterionId: criterionId,
          finalizedById: committeeMemberId,
        },
      }),
    );
  
    await this.prisma.$transaction(transactionPayload);
  
    this.logger.log(`[BRUTAL FACTS] Iniciando processo para colaborador: ${collaborator.name}`);
    if (collaborator.mentor) {
      this.logger.log(`[BRUTAL FACTS] Mentor encontrado: ${collaborator.mentor.name}`);
  
      const consolidatedData = await this.getConsolidatedView(collaboratorId, cycleId);
      this.logger.log('[BRUTAL FACTS] Dados consolidados para a IA foram recolhidos.');
  
      const brutalFacts = await this.genAIService.extractBrutalFacts(consolidatedData);
      this.logger.log(`[BRUTAL FACTS] Texto gerado pela IA: "${brutalFacts.substring(0, 100)}..."`);
  
      await this.prisma.aISummary.create({
        data: {
          summaryType: 'BRUTAL_FACTS',
          content: this.encryptionService.encrypt(brutalFacts),
          collaboratorId: collaboratorId,
          cycleId: cycleId,
          generatedById: committeeMemberId,
        },
      });
  
      this.logger.log(`[BRUTAL FACTS] A chamar NotificationsService para enviar email para: ${collaborator.mentor.email}`);
      await this.notificationsService.sendBrutalFactsToMentor(
        collaborator.mentor,
        collaborator,
        brutalFacts,
        cycle.name,
      );
      this.logger.log('[BRUTAL FACTS] Chamada ao NotificationsService concluída.');
    } else {
      this.logger.warn(`[BRUTAL FACTS] Processo abortado. O colaborador ${collaborator.name} não possui um mentor associado.`);
    }
  
    return { message: `Equalização para o colaborador ${collaborator.name} foi finalizada com sucesso.` };
  }

  public generateEqualizationReportHtml(data: EqualizationResponseDto): string {

    const styles = `
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
        h1, h2, h3 { color: #2c3e50; }
        h1 { font-size: 24px; }
        h2 { font-size: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 30px; }
        .section { margin-bottom: 20px; }
        .criterion { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #f9f9f9; }
        .criterion-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
        .score { font-size: 14px; margin-bottom: 5px; }
        .score span { font-weight: bold; padding: 2px 6px; border-radius: 4px; color: #fff; }
        .score-high { background-color: #27ae60; }
        .score-mid { background-color: #f39c12; }
        .score-low { background-color: #e74c3c; }
        .justification { font-style: italic; color: #555; background-color: #fff; padding: 10px; border-radius: 5px; border: 1px dashed #ccc; }
      </style>
    `;

    const getScoreClass = (score) => {
      if (score >= 4) return 'score-high';
      if (score >= 2.5) return 'score-mid';
      return 'score-low';
    };

    const criteriaHtml = data.consolidatedCriteria.map(c => `
      <div class="criterion">
        <div class="criterion-title">${c.criterionName} ${c.hasDiscrepancy ? '<span style="color: #e74c3c;">(Discrepância!)</span>' : ''}</div>
        ${c.selfEvaluation ? `<div class="score">Autoavaliação: <span class="${getScoreClass(c.selfEvaluation.score)}">${c.selfEvaluation.score}</span></div>` : ''}
        ${c.peerEvaluation ? `<div class="score">Média Pares: <span class="${getScoreClass(c.peerEvaluation.score)}">${c.peerEvaluation.score}</span></div>` : ''}
        ${c.selfEvaluation?.justification ? `<div class="justification"><b>Justificativa:</b> ${c.selfEvaluation.justification}</div>` : ''}
      </div>
    `).join('');
    
    const finalScoreHtml = data.finalScore ? `
      <div class="section">
        <h2>Nota Final da Equalização</h2>
        <div class="criterion">
          <div class="score">Nota Final: <span class="${getScoreClass(data.finalScore)}">${data.finalScore}</span></div>
        </div>
      </div>
    ` : '';

    const body = `
      <div class="container">
        <div class="header">
          <h1>Relatório de Avaliação - RPE</h1>
        </div>
        <div class="section">
          <h2>Dados do Colaborador</h2>
          <p><strong>Nome:</strong> ${data.collaboratorName}</p>
          <p><strong>Ciclo:</strong> ${data.cycleName}</p>
        </div>
        <div class="section">
          <h2>Avaliações por Critério</h2>
          ${criteriaHtml}
        </div>
        ${finalScoreHtml}
      </div>
    `;

    return `<!DOCTYPE html><html><head><title>Relatório de Avaliação</title>${styles}</head><body>${body}</body></html>`;
  }
}
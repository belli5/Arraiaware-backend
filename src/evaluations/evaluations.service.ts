import { Injectable, NotFoundException } from '@nestjs/common';
import { EncryptionService } from '../common/encryption/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitDirectReportEvaluationDto } from './dto/submit-direct-report-evaluation.dto';
import { SubmitLeaderEvaluationDto } from './dto/submit-leader-evaluation.dto';
import { SubmitPeerEvaluationDto } from './dto/submit-peer-evaluation.dto';
import { SubmitReferenceIndicationDto } from './dto/submit-reference-indication.dto';
import { SubmitSelfEvaluationDto } from './dto/submit-self-evaluation.dto';

@Injectable()
export class EvaluationsService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async submitSelfEvaluation(dto: SubmitSelfEvaluationDto) {
    const { userId, cycleId, evaluations } = dto;

    const dataToCreate = evaluations.map((ev) => ({
      userId,
      cycleId,
      criterionId: ev.criterionId,
      score: ev.score,
      justification: this.encryptionService.encrypt(ev.justification),
      scoreDescription: this.encryptionService.encrypt(ev.scoreDescription),
    }));

    return this.prisma.$transaction(
      dataToCreate.map((data) =>
        this.prisma.selfEvaluation.upsert({
          where: {
            userId_cycleId_criterionId: {
              userId: data.userId,
              cycleId: data.cycleId,
              criterionId: data.criterionId,
            },
          },
          update: data,
          create: data,
        }),
      ),
    );
  }

  async submitPeerEvaluation(dto: SubmitPeerEvaluationDto) {
    if (dto.evaluatedUserId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.evaluatedUserId } });
      if (!user) throw new NotFoundException(`Utilizador avaliado com ID ${dto.evaluatedUserId} não encontrado.`);
    }
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!project) {
        throw new NotFoundException(`Projeto com ID ${dto.projectId} não encontrado.`);
      }
    }

    const encryptedDto = {
      ...dto,
      pointsToImprove: this.encryptionService.encrypt(dto.pointsToImprove),
      pointsToExplore: this.encryptionService.encrypt(dto.pointsToExplore),
      motivatedToWorkAgain: this.encryptionService.encrypt(dto.motivatedToWorkAgain),
    };

    return this.prisma.peerEvaluation.create({ data: encryptedDto });
  }

  async submitReferenceIndication(dto: SubmitReferenceIndicationDto) {
    if (dto.indicatedUserId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.indicatedUserId } });
      if (!user) throw new NotFoundException(`Utilizador indicado com ID ${dto.indicatedUserId} não encontrado.`);
    }

    const encryptedDto = {
      ...dto,
      justification: this.encryptionService.encrypt(dto.justification),
    };

    return this.prisma.referenceIndication.create({ data: encryptedDto });
  }

  async findSelfEvaluation(userId: string, cycleId: string) {
    const evaluations = await this.prisma.selfEvaluation.findMany({
      where: { userId, cycleId },
      include: { criterion: true },
    });

    if (!evaluations || evaluations.length === 0) {
      throw new NotFoundException('Autoavaliação não encontrada para este utilizador e ciclo.');
    }

    return evaluations.map((ev) => ({
      ...ev,
      justification: this.encryptionService.decrypt(ev.justification),
      scoreDescription: this.encryptionService.decrypt(ev.scoreDescription),
    }));
  }

  async findPeerEvaluationsForUser(evaluatedUserId: string, cycleId: string) {
    const evaluations = await this.prisma.peerEvaluation.findMany({
      where: { evaluatedUserId, cycleId },
      include: {
        evaluatorUser: { select: { id: true, name: true } },
      },
    });

    return evaluations.map((ev) => ({
      ...ev,
      pointsToImprove: this.encryptionService.decrypt(ev.pointsToImprove),
      pointsToExplore: this.encryptionService.decrypt(ev.pointsToExplore),
      motivatedToWorkAgain: this.encryptionService.decrypt(ev.motivatedToWorkAgain),
    }));
  }

  async findReferenceIndicationsForUser(indicatorUserId: string, cycleId: string) {
    const indications = await this.prisma.referenceIndication.findMany({
      where: { indicatorUserId, cycleId },
      include: {
        indicatorUser: { select: { id: true, name: true } },
      },
    });

    return indications.map((ind) => ({
      ...ind,
      justification: this.encryptionService.decrypt(ind.justification),
    }));
  }

  async getUserStatus(userId: string, cycleId: string) {
    const selfEvaluationDone = await this.prisma.selfEvaluation.findFirst({
      where: { userId, cycleId },
    });

    return {
      userId,
      cycleId,
      status: selfEvaluationDone ? 'Concluído' : 'Pendente',
    };
  }

  async findAllPeerEvaluations(cycleId?: string) {
    const evaluations = await this.prisma.peerEvaluation.findMany({
      where: {
        cycleId: cycleId,
      },
      include: {
        evaluatorUser: {
          select: { id: true, name: true, email: true },
        },
        evaluatedUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return evaluations.map((ev) => ({
      ...ev,
      pointsToImprove: this.encryptionService.decrypt(ev.pointsToImprove),
      pointsToExplore: this.encryptionService.decrypt(ev.pointsToExplore),
      motivatedToWorkAgain: this.encryptionService.decrypt(ev.motivatedToWorkAgain),
    }));
  }

  async submitLeaderEvaluation(dto: SubmitLeaderEvaluationDto) {
    const { collaboratorId, leaderId, cycleId, justification, ...scores } = dto;

    const users = await this.prisma.user.findMany({
      where: { id: { in: [collaboratorId, leaderId] } },
    });
    if (users.length !== 2) {
      throw new NotFoundException('Colaborador ou líder não encontrado.');
    }

    const encryptedData = {
      ...scores,
      justification: this.encryptionService.encrypt(justification),
    };

    return this.prisma.leaderEvaluation.upsert({
      where: {
        leaderId_collaboratorId_cycleId: {
          leaderId,
          collaboratorId,
          cycleId,
        },
      },
      update: encryptedData,
      create: {
        leaderId,
        collaboratorId,
        cycleId,
        ...encryptedData,
      },
    });
  }

  async findPeerEvaluationsDoneByUser(evaluatorUserId: string, cycleId: string) {
    const evaluations = await this.prisma.peerEvaluation.findMany({
      where: { evaluatorUserId, cycleId },
      include: {
        evaluatedUser: { select: { id: true, name: true } },
      },
    });

    return evaluations.map((ev) => ({
      ...ev,
      pointsToImprove: this.encryptionService.decrypt(ev.pointsToImprove),
      pointsToExplore: this.encryptionService.decrypt(ev.pointsToExplore),
      motivatedToWorkAgain: this.encryptionService.decrypt(ev.motivatedToWorkAgain),
    }));
  }

  async findReferenceIndicationsDoneByUser(indicatorUserId: string, cycleId: string) {
    const indications = await this.prisma.referenceIndication.findMany({
      where: { indicatorUserId, cycleId },
      include: {
        indicatedUser: { select: { id: true, name: true } },
      },
    });

    return indications.map((ind) => ({
      ...ind,
      justification: this.encryptionService.decrypt(ind.justification),
    }));
  }

  async submitDirectReportEvaluation(dto: SubmitDirectReportEvaluationDto) {
    const { collaboratorId, leaderId, cycleId, ...scores } = dto;

    const users = await this.prisma.user.findMany({
      where: { id: { in: [collaboratorId, leaderId] } },
    });
    if (users.length !== 2) {
      throw new NotFoundException('Colaborador ou líder não encontrado.');
    }

    return this.prisma.directReportEvaluation.upsert({
      where: {
        collaboratorId_leaderId_cycleId: {
          collaboratorId,
          leaderId,
          cycleId,
        },
      },
      update: {
        ...scores,
      },
      create: {
        collaboratorId,
        leaderId,
        cycleId,
        ...scores,
      },
    });
  }
}

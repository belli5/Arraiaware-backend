import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitPeerEvaluationDto } from './dto/submit-peer-evaluation.dto';
import { SubmitReferenceIndicationDto } from './dto/submit-reference-indication.dto';
import { SubmitSelfEvaluationDto } from './dto/submit-self-evaluation.dto';

@Injectable()
export class EvaluationsService {
  constructor(private prisma: PrismaService) {}

  async submitSelfEvaluation(dto: SubmitSelfEvaluationDto) {
    const { userId, cycleId, evaluations } = dto;
    const dataToCreate = evaluations.map((ev) => ({
      userId,
      cycleId,
      criterionId: ev.criterionId,
      score: ev.score,
      justification: ev.justification,
    }));
    return this.prisma.selfEvaluation.createMany({ data: dataToCreate });
  }

  async submitPeerEvaluation(dto: SubmitPeerEvaluationDto) {
    const { evaluatorUserId, evaluatedUserId, cycleId, evaluations } = dto;
    const dataToCreate = evaluations.map((ev) => ({
      evaluatorUserId,
      evaluatedUserId,
      cycleId,
      criterionId: ev.criterionId,
      score: ev.score,
      justification: ev.justification,
    }));
    return this.prisma.peerEvaluation.createMany({ data: dataToCreate });
  }

  async submitReferenceIndication(dto: SubmitReferenceIndicationDto) {
    return this.prisma.referenceIndication.create({
      data: dto,
    });
  }

    async findSelfEvaluation(userId: string, cycleId: string) {
    const evaluation = await this.prisma.selfEvaluation.findMany({
      where: { userId, cycleId },
      include: {
        criterion: true,
      },
    });
    if (!evaluation || evaluation.length === 0) {
      throw new NotFoundException('Autoavaliação não encontrada para este usuário e ciclo.');
    }
    return evaluation;
  }

  async findPeerEvaluationsForUser(evaluatedUserId: string, cycleId: string) {
    return this.prisma.peerEvaluation.findMany({
      where: { evaluatedUserId, cycleId },
      include: {
        criterion: true,
        evaluatorUser: {
          select: { id: true, name: true },
        },
      },
    });
  }
  

  async findReferenceIndicationsForUser(indicatedUserId: string, cycleId: string) {
    return this.prisma.referenceIndication.findMany({
      where: { indicatedUserId, cycleId },
      include: {
        indicatorUser: {
          select: { id: true, name: true },
        },
      },
    });
  }
  async getUserStatus(userId: string, cycleId: string) {
    const selfEvaluationDone = await this.prisma.selfEvaluation.findFirst({
        where: { userId, cycleId }
    });
    
    return {
        userId,
        cycleId,
        status: selfEvaluationDone ? 'Concluído' : 'Pendente'
    };
  }
}
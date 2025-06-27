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
      scoreDescription: ev.scoreDescription, 
    }));

    return this.prisma.$transaction(
      dataToCreate.map(data => 
        this.prisma.selfEvaluation.upsert({
          where: { userId_cycleId_criterionId: { userId: data.userId, cycleId: data.cycleId, criterionId: data.criterionId } },
          update: data,
          create: data,
        })
      )
    );
  }

  async submitPeerEvaluation(dto: SubmitPeerEvaluationDto) {
    if (dto.evaluatedUserId) {
        const user = await this.prisma.user.findUnique({ where: { id: dto.evaluatedUserId } });
        if (!user) throw new NotFoundException(`Utilizador avaliado com ID ${dto.evaluatedUserId} não encontrado.`);
    }
    
    return this.prisma.peerEvaluation.create({ data: dto });
  }

  async submitReferenceIndication(dto: SubmitReferenceIndicationDto) {
    if (dto.indicatedUserId) {
        const user = await this.prisma.user.findUnique({ where: { id: dto.indicatedUserId } });
        if (!user) throw new NotFoundException(`Utilizador indicado com ID ${dto.indicatedUserId} não encontrado.`);
    }

    return this.prisma.referenceIndication.create({ data: dto });
  }

  async findSelfEvaluation(userId: string, cycleId: string) {
    const evaluation = await this.prisma.selfEvaluation.findMany({
      where: { userId, cycleId },
      include: { criterion: true },
    });
    if (!evaluation || evaluation.length === 0) {
      throw new NotFoundException('Autoavaliação não encontrada para este utilizador e ciclo.');
    }
    return evaluation;
  }

  async findPeerEvaluationsForUser(evaluatedUserId: string, cycleId: string) {
    return this.prisma.peerEvaluation.findMany({
      where: { evaluatedUserId, cycleId },
      include: {
        evaluatorUser: { select: { id: true, name: true } },
      },
    });
  }
  
  async findReferenceIndicationsForUser(indicatedUserId: string, cycleId: string) {
    return this.prisma.referenceIndication.findMany({
      where: { indicatedUserId, cycleId },
      include: {
        indicatorUser: { select: { id: true, name: true } },
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
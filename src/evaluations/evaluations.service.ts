import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitPeerEvaluationDto } from './dto/submit-peer-evaluation.dto';
import { SubmitReferenceIndicationDto } from './dto/submit-reference-indication.dto';
import { SubmitSelfEvaluationDto } from './dto/submit-self-evaluation.dto';
import { SubmitLeaderEvaluationDto } from './dto/submit-leader-evaluation.dto';
import { SubmitDirectReportEvaluationDto } from './dto/submit-direct-report-evaluation.dto';

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
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId }});
      if (!project) {
        throw new NotFoundException(`Projeto com ID ${dto.projectId} não encontrado.`);
      }
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
  
  async findReferenceIndicationsForUser(indicatorUserId: string, cycleId: string) {
    return this.prisma.referenceIndication.findMany({
      where: { indicatorUserId, cycleId },
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
  async findAllPeerEvaluations(cycleId?: string) {
  const evaluations = await this.prisma.peerEvaluation.findMany({
    where: {
      cycleId: cycleId,
    },
    include: {
      evaluatorUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    
      evaluatedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return evaluations;
}
  async submitLeaderEvaluation(dto: SubmitLeaderEvaluationDto) {
    const { collaboratorId, leaderId, cycleId, ...scores } = dto;

    const users = await this.prisma.user.findMany({
      where: { id: { in: [collaboratorId, leaderId] } },
    });
    if (users.length !== 2) {
      throw new NotFoundException('Colaborador ou líder não encontrado.');
    }

    return this.prisma.leaderEvaluation.upsert({
      where: {
        leaderId_collaboratorId_cycleId: {
          leaderId,
          collaboratorId,
          cycleId,
        },
      },
      update: {
        ...scores,
      },
      create: {
        leaderId,
        collaboratorId,
        cycleId,
        ...scores,
      },
    });
  }

  async findPeerEvaluationsDoneByUser(evaluatorUserId: string, cycleId: string) {
    return this.prisma.peerEvaluation.findMany({
      where: { evaluatorUserId, cycleId },
      include: {
        evaluatedUser: { select: { id: true, name: true } }, 
      },
    });
  }
  
  async findReferenceIndicationsDoneByUser(indicatorUserId: string, cycleId: string) {
    return this.prisma.referenceIndication.findMany({
      where: { indicatorUserId, cycleId },
      include: {
        indicatedUser: { select: { id: true, name: true } }, 
      },
    });
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
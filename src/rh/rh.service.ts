import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RhService {
  constructor(private prisma: PrismaService) {}

  async getGlobalStatus(cycleId: string) {

    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: { select: { name: true } } },
    });


    const selfEvaluations = await this.prisma.selfEvaluation.findMany({
      where: { cycleId },
      distinct: ['userId'], 
      select: { userId: true },
    });

    const completedUsers = new Set(selfEvaluations.map((ev) => ev.userId));

    const statusReport = users.map((user) => ({
      userId: user.id,
      name: user.name,
      role: user.role?.name || 'Sem cargo',
      status: completedUsers.has(user.id) ? 'Concluído' : 'Pendente',
    }));

    return statusReport;
  }
 
async exportCycleData(cycleId: string) {
    const selfEvaluations = await this.prisma.selfEvaluation.findMany({
      where: { cycleId },
      include: {
        user: { select: { name: true, email: true } },
        criterion: { select: { criterionName: true, pillar: true } },
      },
    });

    const peerEvaluations = await this.prisma.peerEvaluation.findMany({
      where: { cycleId },
      include: {
        evaluatedUser: { select: { name: true } },
        evaluatorUser: { select: { name: true } },
        criterion: { select: { criterionName: true } },
      },
    });

    const references = await this.prisma.referenceIndication.findMany({
        where: { cycleId },
        include: {
            indicatedUser: { select: { name: true } },
            indicatorUser: { select: { name: true } },
        }
    })


    return {
      selfEvaluations,
      peerEvaluations,
      references,
    };
  }
}
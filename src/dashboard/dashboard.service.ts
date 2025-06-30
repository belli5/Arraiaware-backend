import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationStatsDto } from './dto/evaluation-stats.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getEvaluationStats(cycleId: string): Promise<EvaluationStatsDto> {
    const cycle = await this.prisma.evaluationCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException(`Ciclo de avaliação com ID ${cycleId} não encontrado.`);
    }

    const totalEvaluations = await this.prisma.user.count({
      where: { isActive: true },
    });

   
    const evaluationsByUsers = await this.prisma.selfEvaluation.groupBy({
      by: ['userId'],
      where: {
        cycleId: cycleId,
      },
    });

    const completedEvaluations = evaluationsByUsers.length;

    const uncompletedEvaluations = totalEvaluations - completedEvaluations;
    let pendingEvaluations = 0;
    let overdueEvaluations = 0;
    
    const now = new Date();
    
    if (now > new Date(cycle.endDate)) {
      overdueEvaluations = uncompletedEvaluations;
    } else {
      pendingEvaluations = uncompletedEvaluations;
    }

    return {
      totalEvaluations,
      completedEvaluations,
      pendingEvaluations,
      overdueEvaluations,
    };
  }
}
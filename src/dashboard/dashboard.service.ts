import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetEvaluationsQueryDto } from '../rh/dto/get-evaluations-query.dto';
import { EvaluationStatsDto } from './dto/evaluation-stats.dto';
import {
  EvaluationItem,
  ManagerDashboardDataDto,
} from './dto/manager-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getManagerDashboardData(
    managerId: string,
    query: GetEvaluationsQueryDto,
  ): Promise<ManagerDashboardDataDto> {
    const { cycleId, page = 1, limit = 10 } = query;

    const whereClause: any = { managerId };
    if (cycleId) {
      whereClause.cycleId = cycleId;
    }

    const projects = await this.prisma.project.findMany({
      where: whereClause,
      include: {
        collaborators: {
          include: {
            roles: true,
            selfEvaluations: { where: cycleId ? { cycleId } : undefined },
          },
        },
        cycle: true,
      },
    });

    if (projects.length === 0) {
      return {
        summary: {
          totalCollaborators: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
          overallProgress: 0,
        },
        evaluations: [],
        pagination: { totalItems: 0, totalPages: 0, currentPage: page },
      };
    }

    const evaluationItems: EvaluationItem[] = [];
    const uniqueCollaborators = new Map<string, User>();

    projects.forEach((project) => {
      if (!project.cycle) return;

      project.collaborators.forEach((collab) => {
        if (!uniqueCollaborators.has(collab.id)) {
          uniqueCollaborators.set(collab.id, collab);
        }

        const selfEval = collab.selfEvaluations.find(
          (e) => e.cycleId === project.cycle.id,
        );
        
        const isCompleted = !!selfEval;
        const isOverdue = !isCompleted && new Date() > new Date(project.cycle.endDate);

        let status = 'Pendente';
        if (isCompleted) status = 'Concluído';
        else if (isOverdue) status = 'Em Atraso';

        const departmentRole = collab.roles.find((r) => r.type === 'CARGO');
        const trackRole = collab.roles.find((r) => r.type === 'TRILHA');

        evaluationItems.push({
          id: `${collab.id}-${project.id}`,
          collaborator: collab.name,
          collaboratorId: collab.id,
          department: departmentRole?.name || 'N/D',
          track: trackRole?.name || 'N/D',
          status,
          progress: isCompleted ? 100 : 0,
          deadline: project.cycle.endDate,
          projectName: project.name,
          projectId: project.id,
          cycleId: project.cycle.id,
          cycleName: project.cycle.name,
        });
      });
    });

    const totalCollaborators = uniqueCollaborators.size;
    const completed = evaluationItems.filter(item => item.status === 'Concluído').length;
    const pending = evaluationItems.filter(item => item.status === 'Pendente').length;
    const overdue = evaluationItems.filter(item => item.status === 'Em Atraso').length;
    const totalItems = evaluationItems.length;

    const overallProgress =
      totalItems > 0
        ? Math.round((completed / totalItems) * 100)
        : 0;
    
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedEvaluations = evaluationItems.slice(
      (page - 1) * limit,
      page * limit,
    );

    return {
      summary: {
        totalCollaborators,
        completed,
        pending,
        overdue,
        overallProgress,
      },
      evaluations: paginatedEvaluations,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
      },
    };
  }

  
  async getEvaluationStats(cycleId: string): Promise<EvaluationStatsDto> {
    const cycle = await this.prisma.evaluationCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException(
        `Ciclo de avaliação com ID ${cycleId} não encontrado.`,
      );
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

  
  async getOverallEvaluationStats(): Promise<EvaluationStatsDto> {
    const allCycles = await this.prisma.evaluationCycle.findMany();

    const totalActiveUsers = await this.prisma.user.count({
      where: { isActive: true },
    });

    let totalEvaluations = 0;
    let completedEvaluations = 0;
    let pendingEvaluations = 0;
    let overdueEvaluations = 0;
    const now = new Date();

    for (const cycle of allCycles) {
      const totalForThisCycle = totalActiveUsers;

      const evaluationsByUsers = await this.prisma.selfEvaluation.groupBy({
        by: ['userId'],
        where: {
          cycleId: cycle.id,
        },
      });
      const completedForThisCycle = evaluationsByUsers.length;

      const uncompletedForThisCycle =
        totalForThisCycle - completedForThisCycle;

      if (now > new Date(cycle.endDate)) {
        overdueEvaluations += uncompletedForThisCycle;
      } else {
        pendingEvaluations += uncompletedForThisCycle;
      }

      totalEvaluations += totalForThisCycle;
      completedEvaluations += completedForThisCycle;
    }

    return {
      totalEvaluations,
      completedEvaluations,
      pendingEvaluations,
      overdueEvaluations,
    };
  }
}
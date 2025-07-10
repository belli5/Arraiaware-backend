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
    const { page = 1, limit = 10, cycleId, search, status, department, track } = query;

    const projects = await this.prisma.project.findMany({
      where: {
        managerId,
        ...(cycleId && { cycleId }),
      },
      include: {
        collaborators: {
          where: { isActive: true },
          include: { roles: true },
        },
        cycle: true,
      },
    });

    if (projects.length === 0) {
      return {
        summary: { totalCollaborators: 0, completed: 0, pending: 0, overdue: 0, overallProgress: 0 },
        evaluations: [],
        pagination: { totalItems: 0, totalPages: 0, currentPage: page },
      };
    }

    const collaboratorMap = new Map<string, User & { roles: any[] }>();
    const cycleIds = new Set<string>();
    projects.forEach(p => {
      cycleIds.add(p.cycleId);
      p.collaborators.forEach(c => {
        if (!collaboratorMap.has(c.id)) {
          collaboratorMap.set(c.id, c);
        }
      });
    });
    const collaborators = Array.from(collaboratorMap.values());
    const targetCycleIds = Array.from(cycleIds);

    const completedEvaluations = await this.prisma.selfEvaluation.findMany({
      where: {
        cycleId: { in: targetCycleIds },
        userId: { in: collaborators.map(c => c.id) },
      },
      distinct: ['userId', 'cycleId'],
      select: { userId: true, cycleId: true },
    });
    const completedSet = new Set(completedEvaluations.map(ev => `${ev.userId}-${ev.cycleId}`));


    const evaluationItems: EvaluationItem[] = [];
    projects.forEach(project => {
        project.collaborators.forEach(collab => {
            const isCompleted = completedSet.has(`${collab.id}-${project.cycleId}`);
            const isOverdue = !isCompleted && new Date() > new Date(project.cycle.endDate);

            let currentStatus: string;
            if (isCompleted) currentStatus = 'Concluída';
            else if (isOverdue) currentStatus = 'Em Atraso';
            else currentStatus = 'Pendente';

            const departmentRole = collab.roles.find(r => r.type === 'CARGO');
            const trackRole = collab.roles.find(r => r.type === 'TRILHA');

            evaluationItems.push({
                id: `${collab.id}-${project.id}`,
                collaborator: collab.name,
                collaboratorId: collab.id,
                department: departmentRole?.name || 'N/D',
                track: trackRole?.name || 'N/D',
                status: currentStatus,
                progress: isCompleted ? 100 : 0,
                deadline: project.cycle.endDate,
                completedAt: null,
                projectName: project.name,
                projectId: project.id,
                cycleId: project.cycleId,
                cycleName: project.cycle.name,
            });
        });
    });

    const filteredItems = evaluationItems.filter(ev => {
        const searchMatch = !search || ev.collaborator.toLowerCase().includes(search.toLowerCase());
        const statusMatch = !status || ev.status === status;
        const departmentMatch = !department || ev.department.toLowerCase().includes(department.toLowerCase());
        const trackMatch = !track || ev.track.toLowerCase().includes(track.toLowerCase());
        return searchMatch && statusMatch && departmentMatch && trackMatch;
    });

    const totalCollaborators = collaboratorMap.size;
    const completedCount = evaluationItems.filter(item => item.status === 'Concluída').length;
    const pendingCount = evaluationItems.filter(item => item.status === 'Pendente').length;
    const overdueCount = evaluationItems.filter(item => item.status === 'Em Atraso').length;
    
    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedEvaluations = filteredItems.slice((page - 1) * limit, page * limit);

    return {
      summary: {
        totalCollaborators,
        completed: completedCount,
        pending: pendingCount,
        overdue: overdueCount,
        overallProgress: evaluationItems.length > 0 ? Math.round((completedCount / evaluationItems.length) * 100) : 0,
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
      totalActiveUsers: totalActiveUsers,
      totalEvaluations,
      completedEvaluations,
      pendingEvaluations,
      overdueEvaluations,
    };
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ManagedTeamDto, TeamInfoDto, TeamMemberDto } from './dto/team-info.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async getUserTeamInfo(userId: string): Promise<TeamInfoDto> {
    const project = await this.prisma.project.findFirst({
      where: {
        collaborators: {
          some: {
            id: userId,
          },
        },
      },
      include: {
        collaborators: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
          },
        },
        cycle: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(
        `Nenhum projeto encontrado para o usuário com ID ${userId}.`,
      );
    }

    const teamMates = project.collaborators.filter(
      (collaborator) => collaborator.id !== userId,
    );

    return {
      projectId: project.id,
      projectName: project.name,
      cycleId: project.cycle.id,
      cycleName: project.cycle.name,
      managerId: project.manager.id,
      managerName: project.manager.name,
      collaborators: teamMates,
    };
  }

  async getTeamByManager(managerId: string): Promise<ManagedTeamDto[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        managerId: managerId,
      },
      include: {
        collaborators: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cycle: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      }
    });

    if (!projects || projects.length === 0) {
      throw new NotFoundException(
        `Nenhum projeto encontrado para o gestor com ID ${managerId}.`,
      );
    }

    return projects.map(project => ({
      projectId: project.id,
      projectName: project.name,
      cycleId: project.cycle.id,
      cycleName: project.cycle.name,
      collaborators: project.collaborators,
    }));
  }

  async getMemberOkrs(userId: string) {
    return this.prisma.objective.findMany({
      where: { userId },
      include: { keyResults: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMemberPdis(userId: string) {
    return this.prisma.developmentPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
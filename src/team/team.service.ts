import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ManagedTeamDto, TeamInfoDto } from './dto/team-info.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async getUserProjectsInCurrentCycle(userId: string): Promise<TeamInfoDto[]> {

    const currentCycle = await this.prisma.evaluationCycle.findFirst({
      orderBy: {
        name: 'desc',
      },
    });

    if (!currentCycle) {
      throw new NotFoundException('Nenhum ciclo de avaliação encontrado no sistema.');
    }

    const projects = await this.prisma.project.findMany({
      where: {
        cycleId: currentCycle.id, 
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

    if (!projects || projects.length === 0) {
      throw new NotFoundException(
        `Nenhum projeto encontrado para o usuário com ID ${userId} no ciclo atual ('${currentCycle.name}').`,
      );
    }

    return projects.map(project => {
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
    });
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

async getManagerProjectsInCurrentCycle(userId: string): Promise<TeamInfoDto[]> {
    const currentCycle = await this.prisma.evaluationCycle.findFirst({
      orderBy: {
        name: 'desc',
      },
    });

    if (!currentCycle) {
      throw new NotFoundException('Nenhum ciclo de avaliação encontrado no sistema.');
    }

    const projects = await this.prisma.project.findMany({
      where: {
        cycleId: currentCycle.id,
        managerId: userId,
      },
      include: {
        collaborators: {
          select: { id: true, name: true, email: true },
        },
        manager: {
          select: { id: true, name: true },
        },
        cycle: {
          select: { id: true, name: true },
        },
      },
    });

    if (!projects || projects.length === 0) {
      throw new NotFoundException(
        `Nenhum projeto encontrado para o gestor com ID ${userId} no ciclo atual ('${currentCycle.name}').`,
      );
    }

    // O objeto retornado aqui corresponde ao TeamInfoDto, não ao ManagedTeamDto.
    return projects.map(project => {
      return {
        projectId: project.id,
        projectName: project.name,
        cycleId: project.cycle.id,
        cycleName: project.cycle.name,
        managerId: project.manager.id,
        managerName: project.manager.name,
        collaborators: project.collaborators, // Para o gestor, retornamos todos os colaboradores do time.
      };
    });
  }

}
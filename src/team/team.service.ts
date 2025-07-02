import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamInfoDto, TeamMemberDto } from './dto/team-info.dto';

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
      managerName: project.manager.name,
      collaborators: teamMates,
    };
  }

  async getTeamByManager(managerId: string): Promise<TeamMemberDto[]> {
    const manager = await this.prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      throw new NotFoundException(`Gestor com ID ${managerId} não encontrado.`);
    }

    const teamMembers = await this.prisma.user.findMany({
      where: {
        leaderId: managerId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return teamMembers;
  }
}
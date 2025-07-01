import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamInfoDto } from './dto/team-info.dto';

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
      collaborators: teamMates,
    };
  }
}
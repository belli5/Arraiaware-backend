import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    const { name, cycleId, managerId, collaboratorIds } = createProjectDto;

    // Opcional: Verificar se o ciclo e os usuários existem antes de criar
    const cycle = await this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } });
    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${cycleId} não encontrado.`);
    }

    return this.prisma.project.create({
      data: {
        name,
        cycle: { connect: { id: cycleId } },
        manager: { connect: { id: managerId } },
        collaborators: {
          connect: collaboratorIds.map((id) => ({ id })),
        },
      },
    });
  }

  findAll() {
    return this.prisma.project.findMany({
      include: {
        manager: { select: { id: true, name: true } },
        collaborators: { select: { id: true, name: true } },
        cycle: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        manager: true,
        collaborators: true,
      },
    });
    if (!project) {
      throw new NotFoundException(`Projeto com ID ${id} não encontrado.`);
    }
    return project;
  }
  
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.project.delete({ where: { id } });
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOkrDto } from './dto/create-okr.dto';
import { UpdateKeyResultDto, UpdateObjectiveDto } from './dto/update-okr.dto';

@Injectable()
export class OkrService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOkrDto) {
    return this.prisma.objective.create({
      data: {
        title: dto.title,
        userId: dto.userId,
        cycleId: dto.cycleId,
        keyResults: {
          create: dto.keyResults.map(kr => ({ title: kr.title })),
        },
      },
      include: { keyResults: true },
    });
  }

  async findForUser(userId: string, cycleId: string) {
    return this.prisma.objective.findMany({
      where: { userId, cycleId },
      include: { keyResults: true },
    });
  }

    async updateObjective(id: string, dto: UpdateObjectiveDto) {
    await this.prisma.objective.findUniqueOrThrow({ where: { id } });
    return this.prisma.objective.update({
      where: { id },
      data: dto,
    });
  }

  async updateKeyResult(id: string, dto: UpdateKeyResultDto) {
    await this.prisma.keyResult.findUniqueOrThrow({ where: { id } });
    return this.prisma.keyResult.update({
      where: { id },
      data: dto,
    });
  }

  async removeObjective(id: string) {
    await this.prisma.objective.findUniqueOrThrow({ where: { id } });
    return this.prisma.objective.delete({ where: { id } });
  }
}
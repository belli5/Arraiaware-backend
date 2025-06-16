import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CyclesService {
  constructor(private prisma: PrismaService) {}

  create(createCycleDto: CreateCycleDto) {
    return this.prisma.evaluationCycle.create({
      data: {
        ...createCycleDto,
        status: 'Aberto',
      },
    });
  }

  findAll() {
    return this.prisma.evaluationCycle.findMany({
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const cycle = await this.prisma.evaluationCycle.findUnique({
      where: { id },
    });
    if (!cycle) {
      throw new NotFoundException(`Ciclo com ID ${id} não encontrado.`);
    }
    return cycle;
  }

  async update(id: string, updateCycleDto: UpdateCycleDto) {
    await this.findOne(id);
    return this.prisma.evaluationCycle.update({
      where: { id },
      data: updateCycleDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.evaluationCycle.delete({ where: { id } });
  }
}
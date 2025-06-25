import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { CycleInUseException } from './exceptions/cycle-in-use.exception';
import { CycleNameConflictException } from './exceptions/cycle-name-conflict.exception';
import { CycleNotFoundException } from './exceptions/cycle-not-found.exception';
import { InvalidDateRangeException } from './exceptions/invalid-date-range.exception';
import { CannotUpdateClosedCycleException } from './exceptions/cannot-update-closed-cycle.exception';

@Injectable()
export class CyclesService {
  constructor(private prisma: PrismaService) {}

  async create(createCycleDto: CreateCycleDto) {
    const { name, startDate, endDate } = createCycleDto;

    if (new Date(startDate) > new Date(endDate)) {
      throw new InvalidDateRangeException();
    }

    const existingCycle = await this.prisma.evaluationCycle.findFirst({
      where: { name },
    });

    if (existingCycle) {
      throw new CycleNameConflictException(name);
    }

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
      throw new CycleNotFoundException(id);
    }
    return cycle;
  }

  async update(id: string, updateCycleDto: UpdateCycleDto) {
    const cycle = await this.findOne(id);

    if (cycle.status === 'Fechado') {
      throw new CannotUpdateClosedCycleException(id);
    }

    const newStartDate = updateCycleDto.startDate ? new Date(updateCycleDto.startDate) : new Date(cycle.startDate);
    const newEndDate = updateCycleDto.endDate ? new Date(updateCycleDto.endDate) : new Date(cycle.endDate);

    if (newStartDate > newEndDate) {
      throw new InvalidDateRangeException();
    }

    return this.prisma.evaluationCycle.update({
      where: { id },
      data: updateCycleDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const selfEvaluation = await this.prisma.selfEvaluation.findFirst({
      where: { cycleId: id },
    });

    if (selfEvaluation) {
      throw new CycleInUseException(id);
    }

    return this.prisma.evaluationCycle.delete({ where: { id } });
  }
}
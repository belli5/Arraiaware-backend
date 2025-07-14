import { Injectable } from '@nestjs/common';
import { EvaluationCycle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { CannotUpdateClosedCycleException } from './exceptions/cannot-update-closed-cycle.exception';
import { CycleAlreadyOpenException } from './exceptions/cycle-already-open.exception';
import { CycleDateConflictException } from './exceptions/cycle-date-conflict.exception';
import { CycleInUseException } from './exceptions/cycle-in-use.exception';
import { CycleNameConflictException } from './exceptions/cycle-name-conflict.exception';
import { CycleNotFoundException } from './exceptions/cycle-not-found.exception';
import { InvalidDateRangeException } from './exceptions/invalid-date-range.exception';

@Injectable()
export class CyclesService {
  constructor(private prisma: PrismaService) {}

  private sortCyclesNaturally(cycles: EvaluationCycle[]): EvaluationCycle[] {
    const getSortableParts = (name: string) => {
      const yearMatch = name.match(/(\d{4})/);
      const periodMatch = name.match(/(\d{4})\.(\d)/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
      const period = periodMatch ? parseInt(periodMatch[2], 10) : 0;
      return { year, period, name };
    };
    return cycles.sort((a, b) => {
      const partsA = getSortableParts(a.name);
      const partsB = getSortableParts(b.name);
      if (partsA.year !== partsB.year) return partsB.year - partsA.year;
      if (partsA.period !== partsB.period) return partsB.period - partsA.period;
      return partsB.name.localeCompare(partsA.name);
    });
  }

  async create(createCycleDto: CreateCycleDto) {
    const { name, startDate, endDate } = createCycleDto;
    const newStartDate = new Date(startDate);
    const newEndDate = new Date(endDate);

    if (newStartDate > newEndDate) {
      throw new InvalidDateRangeException();
    }

    const existingOpenCycle = await this.prisma.evaluationCycle.findFirst({
      where: { status: 'Aberto' },
    });

    if (existingOpenCycle) {
      throw new CycleAlreadyOpenException(existingOpenCycle.name);
    }

    const conflictingCycle = await this.prisma.evaluationCycle.findFirst({
      where: {
        AND: [
          { startDate: { lte: newEndDate } },
          { endDate: { gte: newStartDate } },
        ],
      },
    });

    if (conflictingCycle) {
      throw new CycleDateConflictException(
        conflictingCycle.name,
        conflictingCycle.startDate,
        conflictingCycle.endDate,
      );
    }

    const existingCycleByName = await this.prisma.evaluationCycle.findFirst({
      where: { name },
    });

    if (existingCycleByName) {
      throw new CycleNameConflictException(name);
    }

    return this.prisma.evaluationCycle.create({
      data: {
        name,
        startDate: newStartDate,
        endDate: newEndDate,
        status: 'Aberto',
      },
    });
  }

  async findAll() {
    const cycles = await this.prisma.evaluationCycle.findMany({});
    return this.sortCyclesNaturally(cycles);
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
    const cycleToUpdate = await this.findOne(id);
    if (cycleToUpdate.status === 'Fechado') {
      throw new CannotUpdateClosedCycleException(id);
    }

    const newStartDate = updateCycleDto.startDate ? new Date(updateCycleDto.startDate) : new Date(cycleToUpdate.startDate);
    const newEndDate = updateCycleDto.endDate ? new Date(updateCycleDto.endDate) : new Date(cycleToUpdate.endDate);

    if (newStartDate > newEndDate) {
      throw new InvalidDateRangeException();
    }

 
    const conflictingCycle = await this.prisma.evaluationCycle.findFirst({
      where: {
        id: { not: id }, 
        AND: [
          { startDate: { lte: newEndDate } },
          { endDate: { gte: newStartDate } },
        ],
      },
    });

    if (conflictingCycle) {
      throw new CycleDateConflictException(
        conflictingCycle.name,
        conflictingCycle.startDate,
        conflictingCycle.endDate,
      );
    }

    return this.prisma.evaluationCycle.update({
      where: { id },
      data: {
        ...updateCycleDto,
        startDate: newStartDate,
        endDate: newEndDate,
      },
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

  async findActiveCycle() {
    const activeCycles = await this.prisma.evaluationCycle.findMany({
      where: {
        status: 'Aberto',
      },
    });
    if (!activeCycles.length) {
      return null;
    }
    return this.sortCyclesNaturally(activeCycles)[0];
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssociateCriterionDto } from './dto/associate-criterion.dto';
import { CreateCriterionDto } from './dto/create-criterion.dto';
import { UpdateCriterionDto } from './dto/update-criterion.dto';

@Injectable()
export class CriteriaService {
  constructor(private prisma: PrismaService) {}

  create(createCriterionDto: CreateCriterionDto) {
    return this.prisma.evaluationCriterion.create({
      data: createCriterionDto,
    });
  }

  findAll() {
    return this.prisma.evaluationCriterion.findMany();
  }

  async findOne(id: string) {
    const criterion = await this.prisma.evaluationCriterion.findUnique({ where: { id } });
    if (!criterion) {
      throw new NotFoundException(`Critério com ID ${id} não encontrado.`);
    }
    return criterion;
  }

  async update(id: string, updateCriterionDto: UpdateCriterionDto) {
    await this.findOne(id);
    return this.prisma.evaluationCriterion.update({
      where: { id },
      data: updateCriterionDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.evaluationCriterion.delete({ where: { id } });
  }

  
  async associateToRole(criterionId: string, associateCriterionDto: AssociateCriterionDto) {
    const { roleId } = associateCriterionDto;

  
    await this.findOne(criterionId);
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role com ID ${roleId} não encontrada.`);
    }

    return this.prisma.roleCriteria.create({
      data: {
        criterionId,
        roleId,
      },
    });
  }
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssociateCriterionDto } from './dto/associate-criterion.dto';
import { CreateCriterionDto } from './dto/create-criterion.dto';
import { UpdateCriterionDto } from './dto/update-criterion.dto';
import { CriterionInUseException } from './exceptions/criterion-in-use.exception';
import { CriterionNameConflictException } from './exceptions/criterion-name-conflict.exception';
import { CriterionNotFoundException } from './exceptions/criterion-not-found.exception';
import { RoleForAssociationNotFoundException } from './exceptions/role-for-association-not-found.exception';

@Injectable()
export class CriteriaService {
  constructor(private prisma: PrismaService) {}

  async create(createCriterionDto: CreateCriterionDto) {
    const { criterionName } = createCriterionDto;

    const existingCriterion = await this.prisma.evaluationCriterion.findFirst({
      where: {
        criterionName: criterionName,
      },
    });

    if (existingCriterion) {
      throw new CriterionNameConflictException(criterionName);
    }

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
      throw new CriterionNotFoundException(id);
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

    const association = await this.prisma.roleCriteria.findFirst({
      where: { criterionId: id },
    });

    if (association) {
      throw new CriterionInUseException(id);
    }

    return this.prisma.evaluationCriterion.delete({ where: { id } });
  }

  async associateToRole(criterionId: string, associateCriterionDto: AssociateCriterionDto) {
    const { roleId } = associateCriterionDto;

    await this.findOne(criterionId);

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new RoleForAssociationNotFoundException(roleId);
    }

    return this.prisma.roleCriteria.create({
      data: {
        criterionId,
        roleId,
      },
    });
  }
}
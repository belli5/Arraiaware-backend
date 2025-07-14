import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { TrilhaResponseDto } from './dto/trilha-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  create(createRoleDto: CreateRoleDto) {
    return this.prisma.role.create({
      data: createRoleDto,
    });
  }

  findAll() {
    return this.prisma.role.findMany();
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role com ID ${id} não encontrada.`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id);
    return this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.role.delete({ where: { id } });
  }

  async findTrilhasWithCriteria(): Promise<TrilhaResponseDto[]> {
    const roles = await this.prisma.role.findMany({
      where: {
        type: 'TRILHA',
      },
      include: {
        criteria: {
          include: {
            criterion: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      nome_da_trilha: role.name,
      criterios: role.criteria.map((rc) => rc.criterion),
    }));
  }

   async findTrilhaWithCriteria(id: string): Promise<CriterionDto[]> { 
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        type: 'TRILHA',
      },
      include: {
        criteria: {
          select: {
            criterion: true, 
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Trilha com ID ${id} não encontrada.`);
    }

    return role.criteria.map((rc) => rc.criterion);
  }
}

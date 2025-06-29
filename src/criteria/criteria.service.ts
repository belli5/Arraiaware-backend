import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { AssociateCriterionDto } from './dto/associate-criterion.dto';
import { CreateCriterionDto } from './dto/create-criterion.dto';
import { DisassociateCriterionDto } from './dto/disassociate-criterion.dto';
import { UpdateCriterionDto } from './dto/update-criterion.dto';
import { CriterionInUseException } from './exceptions/criterion-in-use.exception';
import { CriterionNameConflictException } from './exceptions/criterion-name-conflict.exception';
import { CriterionNotFoundException } from './exceptions/criterion-not-found.exception';
import { RoleForAssociationNotFoundException } from './exceptions/role-for-association-not-found.exception';

@Injectable()
export class CriteriaService {
  private readonly logger = new Logger(CriteriaService.name);

  private readonly CRITERIA_PILLAR_MAP = {
    'Sentimento de Dono': 'Comportamento',
    'Resiliencia nas adversidades': 'Comportamento',
    'Organização no Trabalho': 'Comportamento',
    'Capacidade de aprender': 'Comportamento',
    'Ser "team player"': 'Comportamento',
    'Entregar com qualidade': 'Execução',
    'Atender aos prazos': 'Execução',
    'Fazer mais com menos': 'Execução',
    'Pensar fora da caixa': 'Execução',
    'Gente': 'Gestão e Liderança',
    'Resultados': 'Gestão e Liderança',
    'Evolução da Rocket Corp': 'Gestão e Liderança',
  };

  constructor(private prisma: PrismaService) {}

  async batchUpdateFromXlsx(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum ficheiro enviado.');
    }

    let renamedCount = 0;
    let createdCount = 0;
    let mergedCount = 0;
    let pillarsCorrectedCount = 0;
    let skippedAsInUse = 0;

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const mergeMap = {
      "Novos Clientes**": "Evolução da Rocket Corp",
      "Novos Projetos**": "Evolução da Rocket Corp",
      "Novos Produtos ou Serviços**": "Evolução da Rocket Corp",
      "Gestão Organizacional*": "Evolução da Rocket Corp"
    };

    for (const row of rows) {
      const oldName = row['Critério Antigo']?.trim();
      let newName = row['Critério Novo']?.trim();

      if (!oldName) continue;

      if (oldName && mergeMap[oldName]) {
        newName = mergeMap[oldName];
      }
      
      const correctPillar = this.CRITERIA_PILLAR_MAP[newName || oldName];
      
      if (!correctPillar) {
        this.logger.warn(`Pilar para "${newName || oldName}" não encontrado no mapa. Pulando.`);
        continue;
      }

      const oldCriterion = await this.prisma.evaluationCriterion.findUnique({
        where: { criterionName: oldName },
      });

      if (!oldCriterion) {
        if (newName) {
          const existingCriterion = await this.prisma.evaluationCriterion.findUnique({
            where: { criterionName: newName },
          });
          if (!existingCriterion) {
            await this.prisma.evaluationCriterion.create({
              data: {
                criterionName: newName,
                pillar: correctPillar,
                description: "Critério criado via importação.",
              },
            });
            createdCount++;
          }
        }
        continue;
      }

      if (!newName || newName.trim() === '') {
        if (oldCriterion.pillar !== correctPillar) {
          await this.prisma.evaluationCriterion.update({
            where: { id: oldCriterion.id },
            data: { pillar: correctPillar },
          });
          pillarsCorrectedCount++;
        }
        continue;
      }
      
      const newCriterionTarget = await this.prisma.evaluationCriterion.findUnique({
        where: { criterionName: newName },
      });

      if (!newCriterionTarget) {
        await this.prisma.evaluationCriterion.update({
          where: { id: oldCriterion.id },
          data: { 
            criterionName: newName,
            pillar: correctPillar 
          },
        });
        renamedCount++;
      } else {
        if (oldCriterion.id === newCriterionTarget.id) continue;
        
        await this.mergeCriteria(oldCriterion.id, newCriterionTarget.id);
        mergedCount++;
        
        if (newCriterionTarget.pillar !== correctPillar) {
           await this.prisma.evaluationCriterion.update({
              where: { id: newCriterionTarget.id },
              data: { pillar: correctPillar }
          });
          pillarsCorrectedCount++;
        }
      }
    }

    return {
      message: "Processamento de critérios e pilares concluído.",
      renamed: renamedCount,
      created: createdCount,
      merged: mergedCount,
      pillarsCorrected: pillarsCorrectedCount,
      skippedAsInUse: skippedAsInUse,
    };
  }
  
  private async isCriterionInUse(criterionId: string): Promise<boolean> {
    const selfEval = await this.prisma.selfEvaluation.findFirst({ where: { criterionId } });
    if (selfEval) return true;

    const roleCrit = await this.prisma.roleCriteria.findFirst({ where: { criterionId } });
    if (roleCrit) return true;

    return false;
  }
  
  private async mergeCriteria(oldId: string, newId: string) {
    await this.prisma.selfEvaluation.updateMany({
      where: { criterionId: oldId },
      data: { criterionId: newId },
    });

    const oldRoleAssociations = await this.prisma.roleCriteria.findMany({ where: { criterionId: oldId } });
    for (const assoc of oldRoleAssociations) {
        const existingNewAssoc = await this.prisma.roleCriteria.findFirst({
            where: { roleId: assoc.roleId, criterionId: newId }
        });
        if (!existingNewAssoc) {
            await this.prisma.roleCriteria.create({
                data: { roleId: assoc.roleId, criterionId: newId }
            });
        }
    }
    
    await this.prisma.roleCriteria.deleteMany({ where: { criterionId: oldId } });
    await this.prisma.evaluationCriterion.delete({ where: { id: oldId } });
  }

  async create(createCriterionDto: CreateCriterionDto) {
    const { criterionName } = createCriterionDto;
    const existingCriterion = await this.prisma.evaluationCriterion.findFirst({
      where: { criterionName },
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

  async disassociateFromRole(criterionId: string, disassociateDto: DisassociateCriterionDto) {
    const { roleId } = disassociateDto;
  
    const association = await this.prisma.roleCriteria.findUnique({
      where: {
        roleId_criterionId: {
          roleId: roleId,
          criterionId: criterionId,
        },
      },
    });
  
    if (!association) {
      throw new NotFoundException(
        `Não foi encontrada uma associação entre o critério ID ${criterionId} e o cargo ID ${roleId}.`,
      );
    }
  
    return this.prisma.roleCriteria.delete({
      where: {
        roleId_criterionId: {
          roleId: roleId,
          criterionId: criterionId,
        },
      },
    });
  }
}
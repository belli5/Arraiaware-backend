import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
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
  private readonly logger = new Logger(CriteriaService.name);

  constructor(private prisma: PrismaService) {}

  async batchUpdateFromXlsx(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum ficheiro enviado.');
    }

    let renamedCount = 0;
    let deletedCount = 0;
    let createdCount = 0;
    let mergedCount = 0;
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
      const oldName = row['Critério Antigo'];
      let newName = row['Critério Novo'];

      if (!oldName && !newName) continue;

      if (oldName && mergeMap[oldName]) {
        newName = mergeMap[oldName];
      }

      const oldCriterion = oldName ? await this.prisma.evaluationCriterion.findUnique({
        where: { criterionName: oldName },
      }) : null;

      if (!oldCriterion) {
        if (newName && newName.trim() !== '') {
          const existingCriterion = await this.prisma.evaluationCriterion.findUnique({
            where: { criterionName: newName },
          });
          if (!existingCriterion) {
            await this.prisma.evaluationCriterion.create({
              data: {
                criterionName: newName,
                pillar: "Comportamento",
                description: "Critério criado via importação.",
              },
            });
            createdCount++;
            this.logger.log(`Critério "${newName}" criado pois o antigo não foi encontrado.`);
          }
        } else {
          this.logger.warn(`Critério antigo "${oldName}" não encontrado e nenhum critério novo especificado. Pulando...`);
        }
        continue;
      }

      if (!newName || newName.trim() === '') {
        if (await this.isCriterionInUse(oldCriterion.id)) {
          skippedAsInUse++;
          this.logger.warn(`Critério "${oldName}" está em uso e não pode ser removido.`);
          continue;
        }
        await this.prisma.evaluationCriterion.delete({ where: { id: oldCriterion.id } });
        deletedCount++;
        this.logger.log(`Critério "${oldName}" removido.`);
      
      } else {
        const newCriterionTarget = await this.prisma.evaluationCriterion.findUnique({
          where: { criterionName: newName },
        });

        if (!newCriterionTarget) {
          await this.prisma.evaluationCriterion.update({
            where: { id: oldCriterion.id },
            data: { criterionName: newName },
          });
          renamedCount++;
          this.logger.log(`Critério "${oldName}" renomeado para "${newName}".`);
        
        } else {
          if (oldCriterion.id === newCriterionTarget.id) continue;
          await this.mergeCriteria(oldCriterion.id, newCriterionTarget.id);
          mergedCount++;
          this.logger.log(`Critério "${oldName}" fundido em "${newName}".`);
        }
      }
    }

    return {
      message: "Processamento de critérios concluído.",
      renamed: renamedCount,
      created: createdCount,
      deleted: deletedCount,
      merged: mergedCount,
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
    const oldSelfEvaluations = await this.prisma.selfEvaluation.findMany({
      where: { criterionId: oldId },
    });

    for (const oldEval of oldSelfEvaluations) {
      const existingNewEval = await this.prisma.selfEvaluation.findFirst({
        where: {
          userId: oldEval.userId,
          cycleId: oldEval.cycleId,
          criterionId: newId,
        },
      });

      if (existingNewEval) {
        await this.prisma.selfEvaluation.delete({ where: { id: oldEval.id } });
      } 
      else {
        await this.prisma.selfEvaluation.update({
          where: { id: oldEval.id },
          data: { criterionId: newId },
        });
      }
    }

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
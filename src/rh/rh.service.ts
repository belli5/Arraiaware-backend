import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import * as XLSX from 'xlsx';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { GetEvaluationsQueryDto } from './dto/get-evaluations-query.dto';
import { HistoryItemDto, ImportHistoryDto } from './dto/import-history.dto';
import { ImportUsersDto } from './dto/import-users.dto';

@Injectable()
export class RhService {
  constructor(
    private prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getGlobalStatus(cycleId: string) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: { select: { name: true } } },
    });

    const selfEvaluations = await this.prisma.selfEvaluation.findMany({
      where: { cycleId },
      distinct: ['userId'],
      select: { userId: true },
    });

    const completedUsers = new Set(selfEvaluations.map((ev) => ev.userId));

    const statusReport = users.map((user) => ({
      userId: user.id,
      name: user.name,
      role: user.role?.name || 'Sem cargo',
      status: completedUsers.has(user.id) ? 'Concluído' : 'Pendente',
    }));

    return statusReport;
  }

  async exportCycleData(cycleId: string) {
    const selfEvaluations = await this.prisma.selfEvaluation.findMany({
      where: { cycleId },
      include: {
        user: { select: { name: true, email: true } },
        criterion: { select: { criterionName: true, pillar: true } },
      },
    });

    const peerEvaluations = await this.prisma.peerEvaluation.findMany({
      where: { cycleId },
      include: {
        evaluatedUser: { select: { name: true } },
        evaluatorUser: { select: { name: true } },
      },
    });

    const references = await this.prisma.referenceIndication.findMany({
      where: { cycleId },
      include: {
        indicatedUser: { select: { name: true } },
        indicatorUser: { select: { name: true } },
      },
    });

    return {
      selfEvaluations,
      peerEvaluations,
      references,
    };
  }

  async findPaginatedEvaluations(queryDto: GetEvaluationsQueryDto) {
    const { page, limit, search, status, department } = queryDto;
    const skip = (page - 1) * limit;

    const currentCycle = await this.prisma.evaluationCycle.findFirst({
      orderBy: { startDate: 'desc' },
    });

    if (!currentCycle) {
      throw new NotFoundException('Nenhum ciclo de avaliação encontrado.');
    }

    const where: Prisma.UserWhereInput = { isActive: true };
    const filterConditions: Prisma.UserWhereInput[] = [];

    if (department) filterConditions.push({ role: { type: { equals: department } } });
    if (search) filterConditions.push({ OR: [{ name: { contains: search } }, { role: { name: { contains: search } } }] });
    if (filterConditions.length > 0) where.AND = filterConditions;

    const completedUserIds = (await this.prisma.selfEvaluation.findMany({
      where: { cycleId: currentCycle.id },
      distinct: ['userId'],
      select: { userId: true },
    })).map((ev) => ev.userId);

    const isOverdue = new Date() > new Date(currentCycle.endDate);

    if (status === 'Concluída') where.id = { in: completedUserIds };
    else if (status === 'Pendente') where.id = { notIn: completedUserIds };
    else if (status === 'Em Atraso') {
      if (!isOverdue) return { data: [], pagination: { totalItems: 0, totalPages: 0, currentPage: page } };
      where.id = { notIn: completedUserIds };
    }

    const [totalItems, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, skip, take: limit, include: { role: true } }),
    ]);

    const data = users.map((user) => {
      const userStatus = completedUserIds.includes(user.id) ? 'Concluída' : isOverdue ? 'Em Atraso' : 'Pendente';
      return {
        id: user.id,
        collaborator: user.name,
        department: user.role?.name || 'N/A',
        track: user.role?.name || 'N/A',
        status: userStatus,
        progress: userStatus === 'Concluída' ? 100 : 0,
        deadline: currentCycle.endDate,
        completedAt: null,
      };
    });

    const totalPages = Math.ceil(totalItems / limit);
    return { data, pagination: { totalItems, totalPages, currentPage: page } };
  }

  async importUsersFromMultipleXlsx(files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    let allUsers = [];

    const findValue = (row: any, possibleKeys: string[]) => {
      for (const key in row) {
        const normalizedKey = key.trim().toLowerCase();
        if (possibleKeys.some(pk => normalizedKey.startsWith(pk))) {
          return row[key];
        }
      }
      return undefined;
    };

    for (const file of files) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const usersJson: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!usersJson || usersJson.length === 0) {
        console.warn(`Arquivo ${file.originalname} está vazio ou em formato incorreto. Pulando.`);
        continue;
      }
      
      const mappedUsers = usersJson.map((row, index) => {
        const name = findValue(row, ['nome', 'name']);
        const email = findValue(row, ['email']);
        const unidade = findValue(row, ['unidade', 'unit']);

        if (!name || !email) {
          console.warn(`A linha ${index + 2} do arquivo ${file.originalname} é inválida. Pulando.`);
          return null;
        }

        return { name, email, unidade };
      }).filter(user => user !== null);

      allUsers = allUsers.concat(mappedUsers);
    }

    if (allUsers.length === 0) {
      throw new BadRequestException("Nenhum registro de usuário válido foi encontrado nos arquivos enviados.");
    }

    const importUsersDto: ImportUsersDto = {
      users: allUsers,
    };

    return this.importUsers(importUsersDto);
  }

  async importUsers(dto: ImportUsersDto) {
    let createdCount = 0;
    let existingCount = 0;

    for (const userRecord of dto.users) {
      if (!userRecord || !userRecord.email) {
        console.warn('Registro de usuário inválido pulado:', userRecord);
        continue;
      }
      const initialPassword = randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(initialPassword, 10);
      const user = await this.prisma.user.upsert({
        where: { email: userRecord.email },
        update: { name: userRecord.name, unidade: userRecord.unidade },
        create: {
          name: userRecord.name,
          email: userRecord.email,
          unidade: userRecord.unidade,
          userType: UserType.COLABORADOR,
          passwordHash: hashedPassword,
        },
      });
      const wasJustCreated = new Date().getTime() - user.createdAt.getTime() < 3000;
      if (wasJustCreated) {
        createdCount++;
        await this.emailService.sendWelcomeEmail(user.email, initialPassword);
      } else {
        existingCount++;
      }
    }
    return { message: 'Importação de usuários concluída.', createdUsers: createdCount, existingUsers: existingCount };
  }

  async importHistoryFromMultipleXlsx(files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    let allRecords: HistoryItemDto[] = [];

    const findValue = (row: any, keys: string[]) => {
      for (const key in row) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, ' ');
        for (const searchKey of keys) {
          if (normalizedKey.includes(searchKey.toLowerCase())) {
            return row[key];
          }
        }
      }
      return undefined;
    };

    for (const file of files) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      
      const profileSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('perfil'));
      if (!profileSheetName) {
        console.warn(`[AVISO] Arquivo ${file.originalname} não contém uma aba 'Perfil'. Pulando...`);
        continue;
      }
      
      const profileSheet = workbook.Sheets[profileSheetName];
      const profileData: any[] = XLSX.utils.sheet_to_json(profileSheet);
      if (profileData.length === 0) continue;

      const userEmail = findValue(profileData[0], ['email']);
      const cycleName = findValue(profileData[0], ['ciclo']);

      if (!userEmail || !cycleName) {
        console.warn(`[AVISO] Não foi possível extrair email ou ciclo da aba 'Perfil' do ficheiro ${file.originalname}. Pulando...`);
        continue;
      }
      
      for (const sheetName of workbook.SheetNames) {
        if (sheetName.toLowerCase().includes('perfil')) continue;

        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        if (rows.length === 0) continue;

        const headers = Object.keys(rows[0]).map(h => h.trim().toLowerCase());

        if (headers.includes('auto-avaliação')) {
          rows.forEach(row => {
            allRecords.push({
              userEmail: userEmail,
              cycleName: cycleName.toString(),
              evaluationType: 'SELF',
              criterionName: findValue(row, ['critério']),
              score: findValue(row, ['auto-avaliação']),
              scoreDescription: findValue(row, ['descrição nota']), 
              justification: findValue(row, ['dados e fatos']),
            });
          });
        } else if (headers.includes('dê uma nota geral para o colaborador')) {
          rows.forEach(row => {
            allRecords.push({
              userEmail: userEmail,
              cycleName: cycleName.toString(),
              evaluationType: 'PEER',
              evaluatorEmail: findValue(row, ['email do avaliado']),
              project: findValue(row, ['projeto em que atuaram juntos']),
              motivatedToWorkAgain: findValue(row, ['motivado em trabalhar novamente']),
              generalScore: findValue(row, ['nota geral']),
              pointsToImprove: findValue(row, ['pontos que deve melhorar']),
              pointsToExplore: findValue(row, ['pontos que faz bem']),
            });
          });
        } else if (headers.includes('justificativa') && headers.includes('email da referência')) {
          rows.forEach(row => {
            allRecords.push({
                userEmail: userEmail,
                cycleName: cycleName.toString(),
                evaluationType: 'REFERENCE',
                indicatedEmail: findValue(row, ['email da referência']),
                justification: findValue(row, ['justificativa']),
            });
          });
        }
      }
    }

    if (allRecords.length === 0) {
      throw new BadRequestException("Nenhum registro de histórico válido foi encontrado nos arquivos enviados. Verifique os nomes das colunas e o conteúdo dos ficheiros.");
    }

    return this.importHistory({ records: allRecords });
  }

  async importHistory(importData: ImportHistoryDto) {
    let createdEvaluationCount = 0;
    let createdUserCount = 0;
    const errors = [];

    for (const record of importData.records) {
      if (!record.userEmail || !record.cycleName || !record.evaluationType) {
        console.warn('[AVISO] Registro de histórico inválido ignorado:', record);
        continue;
      }

      const { id: userId, wasCreated: userWasCreated } = await this.findOrCreateUser(record.userEmail);
      if (userWasCreated) createdUserCount++;

      const cycle = await this.prisma.evaluationCycle.upsert({
        where: { name: record.cycleName.toString() },
        update: {},
        create: { name: record.cycleName.toString(), startDate: new Date(), endDate: new Date(), status: "Fechado" },
      });

      try {
        if (record.evaluationType === 'SELF' && record.criterionName) {
          const criterion = await this.prisma.evaluationCriterion.upsert({
            where: { criterionName: record.criterionName },
            update: {},
            create: { criterionName: record.criterionName, pillar: "Comportamento", description: "Critério importado automaticamente." },
          });

          const scoreAsNumber = parseInt(String(record.score), 10);
          const finalScore = isNaN(scoreAsNumber) ? 0 : scoreAsNumber;

          const finalJustification = record.justification || 'Não aplicável';
          const finalScoreDescription = record.scoreDescription || (finalScore === 0 ? 'Não se Aplica' : '');

          const data = {
            userId,
            cycleId: cycle.id,
            criterionId: criterion.id,
            score: finalScore,
            justification: finalJustification,
            scoreDescription: finalScoreDescription,
            submissionStatus: 'Concluído'
          };

          await this.prisma.selfEvaluation.create({ data });
          createdEvaluationCount++;

        } else if (record.evaluationType === 'PEER' && record.evaluatorEmail && record.generalScore) {
          const { id: evaluatorId, wasCreated: evaluatorWasCreated } = await this.findOrCreateUser(record.evaluatorEmail);
          if (evaluatorWasCreated) createdUserCount++;

          const data = { evaluatedUserId: userId, evaluatorUserId: evaluatorId, cycleId: cycle.id, project: record.project, motivatedToWorkAgain: record.motivatedToWorkAgain, generalScore: record.generalScore, pointsToImprove: record.pointsToImprove, pointsToExplore: record.pointsToExplore };

          await this.prisma.peerEvaluation.create({ data });
          createdEvaluationCount++;

        } else if (record.evaluationType === 'REFERENCE' && record.indicatedEmail && record.justification) {
          const { id: indicatedId, wasCreated: indicatedWasCreated } = await this.findOrCreateUser(record.indicatedEmail);
          if (indicatedWasCreated) createdUserCount++;

          const data = { indicatorUserId: userId, indicatedUserId: indicatedId, cycleId: cycle.id, justification: record.justification };

          await this.prisma.referenceIndication.create({ data });
          createdEvaluationCount++;
        }
      } catch (error) {
        if (error.code === 'P2002') { 
          const message = `Registro duplicado encontrado para ${record.userEmail} no ciclo ${record.cycleName}.`;
          console.error(`[ERRO] ${message}`, error);
          errors.push(message);
        } else {
          const message = `Falha ao importar registro para ${record.userEmail}: ${error.message}`;
          console.error(`[ERRO] ${message}`, error);
          errors.push(message);
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Ocorreram erros durante a importação. Verifique os logs do console para mais detalhes.',
        errors,
      });
    }

    return { message: `${createdEvaluationCount} registros de avaliação importados e ${createdUserCount} novos usuários criados com sucesso.` };
  }

  private async findOrCreateUser(email: string): Promise<{ id: string, wasCreated: boolean }> {
    if (!email || typeof email !== 'string') {
      throw new Error(`Email inválido fornecido para findOrCreateUser: ${email}`);
    }
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      return { id: user.id, wasCreated: false };
    }
    const initialPassword = randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    user = await this.prisma.user.create({
      data: { email, name: email.split('@')[0], userType: UserType.COLABORADOR, passwordHash },
    });
    
    try {
        await this.emailService.sendWelcomeEmail(user.email, initialPassword);
    } catch (emailError) {
        console.error(`[AVISO] Falha ao enviar e-mail de boas-vindas para ${user.email}, mas o usuário foi criado. Erro: ${emailError.message}`);
    }
    
    return { id: user.id, wasCreated: true };
  }
}
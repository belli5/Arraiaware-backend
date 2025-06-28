import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  private readonly logger = new Logger(RhService.name);

  constructor(
    private prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ... (os outros métodos como getGlobalStatus, exportCycleData, etc. não precisam de alteração) ...
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
    this.logger.log(`Iniciando importação de usuários para ${files.length} arquivo(s).`);
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const results = [];
    for (const file of files) {
        let status = 'Sucesso';
        let importResult;
        try {
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const usersJson: any[] = XLSX.utils.sheet_to_json(sheet);

            if (!usersJson || usersJson.length === 0) {
                throw new BadRequestException(`Arquivo ${file.originalname} está vazio ou em formato inválido.`);
            }

            const importUsersDto: ImportUsersDto = { users: usersJson };
            importResult = await this.importUsers(importUsersDto);
            results.push({ file: file.originalname, ...importResult });

        } catch (error) {
            status = 'Falha';
            this.logger.error(`Falha ao processar o arquivo ${file.originalname}: ${error.message}`, error.stack);
            results.push({ file: file.originalname, message: error.message, errors: [error.message] });
        } finally {
            await this.prisma.importHistory.create({
                data: {
                    fileName: file.originalname,
                    status: status,
                    file: file.buffer,
                },
            });
        }
    }
    return results;
  }

  async importUsers(dto: ImportUsersDto) {
    let createdCount = 0;
    let updatedCount = 0;
    for (const userRecord of dto.users) {
        if (!userRecord || !userRecord.email) continue;
        const initialPassword = randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(initialPassword, 10);

        const user = await this.prisma.user.upsert({
            where: { email: userRecord.email },
            update: { name: userRecord.name, unidade: userRecord.unidade },
            create: { name: userRecord.name, email: userRecord.email, unidade: userRecord.unidade, userType: UserType.COLABORADOR, passwordHash: hashedPassword },
        });

        const wasJustCreated = new Date().getTime() - user.createdAt.getTime() < 3000;
        if (wasJustCreated) {
            createdCount++;
            await this.emailService.sendWelcomeEmail(user.email, initialPassword);
        } else {
            updatedCount++;
        }
    }
    return { message: 'Importação de usuários concluída.', created: createdCount, updated: updatedCount };
  }
  
  async importHistoryFromMultipleXlsx(files: Array<Express.Multer.File>) {
    this.logger.log(`Iniciando importação de histórico para ${files.length} arquivo(s).`);
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const results = [];
    for (const file of files) {
        let status = 'Sucesso';
        let importResult;
        try {
            this.logger.log(`Processando arquivo: ${file.originalname}`);
            const allRecords = this.extractHistoryRecordsFromFile(file);

            if (allRecords.length === 0) {
                throw new BadRequestException("Nenhum registro de histórico válido foi encontrado no arquivo.");
            }

            this.logger.log(`Extraídos ${allRecords.length} registros de ${file.originalname}.`);
            importResult = await this.importHistory({ records: allRecords });

            if (importResult.errors.length > 0) {
                status = 'Falha Parcial';
            }
            results.push({ file: file.originalname, ...importResult });

        } catch (error) {
            status = 'Falha Total';
            this.logger.error(`Falha ao processar o arquivo de histórico ${file.originalname}: ${error.message}`, error.stack);
            results.push({ file: file.originalname, message: error.message, errors: [error.message] });
        } finally {
            this.logger.log(`Salvando histórico para ${file.originalname} com status: ${status}`);
            await this.prisma.importHistory.create({
                data: {
                    fileName: file.originalname,
                    status: status,
                    file: file.buffer,
                },
            });
        }
    }
    return results;
  }

  private extractHistoryRecordsFromFile(file: Express.Multer.File): HistoryItemDto[] {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const profileSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('perfil'));
    if (!profileSheetName) {
        this.logger.warn(`Arquivo ${file.originalname} sem aba 'Perfil'. Pulando.`);
        return [];
    }

    const profileSheet = workbook.Sheets[profileSheetName];
    const profileData: any[] = XLSX.utils.sheet_to_json(profileSheet);
    if (profileData.length === 0) return [];

    const findValue = (row: any, keys: string[]) => {
      for (const key in row) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, ' ');
        if (keys.some(searchKey => normalizedKey.includes(searchKey.toLowerCase()))) {
          return row[key];
        }
      }
      return undefined;
    };
    
    const userEmail = findValue(profileData[0], ['email']);
    const cycleName = findValue(profileData[0], ['ciclo']);

    if (!userEmail || !cycleName) {
        this.logger.warn(`Não foi possível extrair email/ciclo do arquivo ${file.originalname}.`);
        return [];
    }
    
    const allRecords: HistoryItemDto[] = [];
    for (const sheetName of workbook.SheetNames) {
        if (sheetName.toLowerCase().includes('perfil')) continue;
        
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        if (rows.length === 0) continue;

        const headers = Object.keys(rows[0]).map(h => h.trim().toLowerCase());

        if (headers.includes('auto-avaliação')) {
          rows.forEach(row => {
            allRecords.push({ userEmail, cycleName: cycleName.toString(), evaluationType: 'SELF', criterionName: findValue(row, ['critério']), score: findValue(row, ['auto-avaliação']), scoreDescription: findValue(row, ['descrição nota']), justification: findValue(row, ['dados e fatos']) });
          });
        } else if (headers.includes('dê uma nota geral para o colaborador')) {
          rows.forEach(row => {
            allRecords.push({ userEmail, cycleName: cycleName.toString(), evaluationType: 'PEER', evaluatorEmail: findValue(row, ['email do avaliado']), project: findValue(row, ['projeto em que atuaram juntos']), motivatedToWorkAgain: findValue(row, ['motivado em trabalhar novamente']), generalScore: findValue(row, ['nota geral']), pointsToImprove: findValue(row, ['pontos que deve melhorar']), pointsToExplore: findValue(row, ['pontos que faz bem']) });
          });
        } else if (headers.includes('justificativa') && headers.includes('email da referência')) {
          rows.forEach(row => {
            allRecords.push({ userEmail, cycleName: cycleName.toString(), evaluationType: 'REFERENCE', indicatedEmail: findValue(row, ['email da referência']), justification: findValue(row, ['justificativa']) });
          });
        }
    }
    return allRecords;
  }
  
  async importHistory(importData: ImportHistoryDto) {
    let processedCount = 0;
    let createdUserCount = 0;
    const errors = [];
  
    for (const record of importData.records) {
      try {
        if (!record.userEmail || !record.cycleName || !record.evaluationType) {
          throw new Error('Registro com campos essenciais faltando.');
        }
  
        const { id: userId, wasCreated: userWasCreated } = await this.findOrCreateUser(record.userEmail);
        if (userWasCreated) createdUserCount++;
  
        const cycle = await this.prisma.evaluationCycle.upsert({
          where: { name: record.cycleName.toString() },
          update: {},
          create: { name: record.cycleName.toString(), startDate: new Date(), endDate: new Date(), status: "Fechado" },
        });
  
        if (record.evaluationType === 'SELF' && record.criterionName) {
          const criterion = await this.prisma.evaluationCriterion.upsert({ where: { criterionName: record.criterionName }, update: {}, create: { criterionName: record.criterionName, pillar: "Comportamento" } });
          const scoreAsNumber = parseInt(String(record.score), 10);
          const data = { userId, cycleId: cycle.id, criterionId: criterion.id, score: isNaN(scoreAsNumber) ? 0 : scoreAsNumber, justification: record.justification || 'N/A', scoreDescription: record.scoreDescription || '', submissionStatus: 'Concluído' };
          
          await this.prisma.selfEvaluation.upsert({
            where: { userId_cycleId_criterionId: { userId, cycleId: cycle.id, criterionId: criterion.id } },
            update: data,
            create: data,
          });
          
          processedCount++;
        }
  
      } catch (error) {
        const errorMessage = `Falha ao processar registro para ${record.userEmail}: ${error.message}`;
        this.logger.error(errorMessage, error.stack);
        errors.push(errorMessage);
      }
    }
  
    const message = `Importação concluída. Processados: ${processedCount} registros de avaliação. Novos usuários: ${createdUserCount}. Erros: ${errors.length}.`;
    this.logger.log(message);
    
    return { message, errors };
  }
  
  private async findOrCreateUser(email: string): Promise<{ id: string, wasCreated: boolean }> {
    if (!email || typeof email !== 'string') {
      this.logger.error(`Tentativa de criar usuário com email inválido: ${email}`);
      throw new Error(`Email inválido fornecido para findOrCreateUser: ${email}`);
    }
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      return { id: user.id, wasCreated: false };
    }
    
    this.logger.log(`Usuário com email ${email} não encontrado. Criando novo usuário.`);
    const initialPassword = randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    user = await this.prisma.user.create({
      data: { email, name: email.split('@')[0], userType: UserType.COLABORADOR, passwordHash },
    });
  
    try {
      await this.emailService.sendWelcomeEmail(user.email, initialPassword);
    } catch (emailError) {
      this.logger.warn(`Falha ao enviar e-mail de boas-vindas para ${user.email} (serviço de e-mail pode estar indisponível), mas o usuário foi criado.`);
    }
  
    return { id: user.id, wasCreated: true };
  }
}

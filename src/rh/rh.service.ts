import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EvaluationCycle, Prisma, UserType } from '@prisma/client';
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

  async getGlobalStatus(cycleId: string) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, roles: { select: { name: true } } },
    });
    const selfEvaluations = await this.prisma.selfEvaluation.findMany({
      where: { cycleId },
      distinct: ['userId'],
      select: { userId: true },
    });
    const completedUsers = new Set(selfEvaluations.map((ev) => ev.userId));
    return users.map((user) => ({
      userId: user.id,
      name: user.name,
      role: user.roles.map(r => r.name).join(', ') || 'Sem cargo',
      status: completedUsers.has(user.id) ? 'Concluído' : 'Pendente',
    }));
  }

  async exportCycleData(cycleId: string) {
    const selfEvaluations = await this.prisma.selfEvaluation.findMany({ where: { cycleId }, include: { user: { select: { name: true, email: true } }, criterion: { select: { criterionName: true, pillar: true } } } });
    const peerEvaluations = await this.prisma.peerEvaluation.findMany({ where: { cycleId }, include: { evaluatedUser: { select: { name: true } }, evaluatorUser: { select: { name: true } } } });
    const references = await this.prisma.referenceIndication.findMany({ where: { cycleId }, include: { indicatedUser: { select: { name: true } }, indicatorUser: { select: { name: true } } } });
    return { selfEvaluations, peerEvaluations, references };
  }
  
  async findPaginatedEvaluations(queryDto: GetEvaluationsQueryDto) {
    const { page, limit, cycleId } = queryDto;

    const cycles = await this._getTargetCycles(cycleId);
    if (cycles.length === 0) {
      return [];
    }
    
    const resultsByCycle = [];

    for (const cycle of cycles) {
      const completedUserIds = (await this.prisma.selfEvaluation.findMany({
        where: { cycleId: cycle.id },
        distinct: ['userId'],
        select: { userId: true },
      })).map((ev) => ev.userId);

      const where = this._buildUserWhereClause(queryDto, completedUserIds, cycle);

      const [totalItems, users] = await this.prisma.$transaction([
        this.prisma.user.count({ where }),
        this.prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: { roles: true },
        }),
      ]);

      const data = users.map((user) => {
        const isOverdue = new Date() > new Date(cycle.endDate);
        const userStatus = completedUserIds.includes(user.id) ? 'Concluída' : isOverdue ? 'Em Atraso' : 'Pendente';
        
        const departmentRole = user.roles.find(r => r.type === 'CARGO');
        const trackRole = user.roles.find(r => r.type === 'TRILHA');

        return {
          id: user.id,
          collaborator: user.name,
          department: departmentRole?.name || 'N/A',
          track: trackRole?.name || 'N/A',
          status: userStatus,
          progress: userStatus === 'Concluída' ? 100 : 0,
          deadline: cycle.endDate,
          completedAt: null,
        };
      });
      
      const totalPages = Math.ceil(totalItems / limit);
      resultsByCycle.push({
        cycleId: cycle.id,
        cycleName: cycle.name,
        data,
        pagination: { totalItems, totalPages, currentPage: page },
      });
    }

    return resultsByCycle;
  }

  private async _getTargetCycles(cycleId?: string): Promise<EvaluationCycle[]> {
    if (cycleId) {
      const cycle = await this.prisma.evaluationCycle.findUnique({ where: { id: cycleId } });
      if (!cycle) {
        throw new NotFoundException(`Ciclo de avaliação com ID ${cycleId} não encontrado.`);
      }
      return [cycle];
    }
    
    const cycles = await this.prisma.evaluationCycle.findMany({ orderBy: { startDate: 'desc' } });
    
    if (!cycles || cycles.length === 0) {
      throw new NotFoundException('Nenhum ciclo de avaliação encontrado.');
    }
    
    return cycles;
  }
  
  private _buildUserWhereClause(
    queryDto: GetEvaluationsQueryDto,
    completedUserIds: string[],
    targetCycle: EvaluationCycle,
  ): Prisma.UserWhereInput {
    const { search, status, department, track } = queryDto; 
    const where: Prisma.UserWhereInput = { isActive: true };
    const filterConditions: Prisma.UserWhereInput[] = [];

    if (department) {
      filterConditions.push({ roles: { some: { name: { contains: department }, type: 'CARGO' } } });
    }

    if (track) {
      filterConditions.push({ roles: { some: { name: { contains: track }, type: 'TRILHA' } } });
    }
    
    if (search) {
      filterConditions.push({ name: { contains: search } });
    }
    
    if (filterConditions.length > 0) {
      where.AND = filterConditions;
    }
    
    const isOverdue = new Date() > new Date(targetCycle.endDate);

    if (status === 'Concluída') {
      where.id = { in: completedUserIds };
    } else if (status === 'Pendente') {
      where.id = { notIn: completedUserIds };
    } else if (status === 'Em Atraso') {
      if (isOverdue) {
        where.id = { notIn: completedUserIds };
      } else {
        where.id = { in: [] };
      }
    }

    return where;
  }

  async importUsersFromMultipleXlsx(files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) throw new BadRequestException('Nenhum arquivo enviado.');
    const allUsers = [];
    const findValue = (row: any, possibleKeys: string[]) => {
      for (const key in row) {
        const normalizedKey = key.trim().toLowerCase();
        if (possibleKeys.some(pk => normalizedKey.startsWith(pk))) return row[key];
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
      allUsers.push(...mappedUsers);
    }
    if (allUsers.length === 0) throw new BadRequestException("Nenhum registro de usuário válido foi encontrado nos arquivos enviados.");
    return this.importUsers({ users: allUsers });
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
        create: { name: userRecord.name, email: userRecord.email, unidade: userRecord.unidade, userType: UserType.COLABORADOR, passwordHash: hashedPassword },
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
          this.logger.warn(`Nenhum registro de histórico válido foi extraído do arquivo ${file.originalname}.`);
          importResult = { message: "Nenhum registro válido encontrado.", errors: [], processed: 0, skipped: 0, createdUsers: 0 };
        } else {
          this.logger.log(`Extraídos ${allRecords.length} registros de ${file.originalname}.`);
          importResult = await this.importHistory({ records: allRecords });
        }

        if (importResult.errors.length > 0) {
          status = importResult.processed > 0 ? 'Falha Parcial' : 'Falha Total';
        }
        results.push({ file: file.originalname, ...importResult });

      } catch (error) {
        status = 'Falha Total';
        this.logger.error(`Falha crítica ao processar o arquivo ${file.originalname}: ${error.message}`, error.stack);
        results.push({ file: file.originalname, message: error.message, errors: [error.message], processed: 0, skipped: 0, createdUsers: 0 });
      } finally {
        await this.prisma.importHistory.create({
          data: { fileName: file.originalname, status: status, file: file.buffer },
        });
        this.logger.log(`Arquivo ${file.originalname} processado com status: ${status}`);
      }
    }
    return results;
  }
  
  private extractHistoryRecordsFromFile(file: Express.Multer.File): HistoryItemDto[] {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const findValue = (row: any, keys: string[]) => {
      for (const key in row) {
        const normalizedKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, ''); 
        if (keys.some(searchKey => normalizedKey.includes(searchKey.toLowerCase().replace(/[^a-z0-9]/g, '')))) return row[key];
      }
      return undefined;
    };
    const profileSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('perfil'));
    if (!profileSheetName) {
      this.logger.warn(`Arquivo ${file.originalname} não contém a aba 'Perfil'. Pulando.`);
      return [];
    }
    const profileSheet = workbook.Sheets[profileSheetName];
    const profileData: any[] = XLSX.utils.sheet_to_json(profileSheet);
    if (profileData.length === 0) {
      this.logger.warn(`Aba 'Perfil' do arquivo ${file.originalname} está vazia.`);
      return [];
    }
    const userEmail = findValue(profileData[0], ['email']);
    const cycleName = findValue(profileData[0], ['ciclo']);
    if (!userEmail || !cycleName) {
      this.logger.warn(`Não foi possível extrair e-mail ou nome do ciclo da aba 'Perfil' em ${file.originalname}.`);
      return [];
    }
    const allRecords: HistoryItemDto[] = [];
    for (const sheetName of workbook.SheetNames) {
      const normalizedSheetName = sheetName.toLowerCase();
      
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      if (rows.length === 0) continue;

      if (normalizedSheetName.includes('autoavaliação')) {
        this.logger.log(`Processando aba de Autoavaliação: "${sheetName}"`);
        rows.forEach(row => allRecords.push({ userEmail, cycleName: cycleName.toString(), evaluationType: 'SELF', criterionName: findValue(row, ['critério']), score: findValue(row, ['auto-avaliação']), scoreDescription: findValue(row, ['descrição nota']), justification: findValue(row, ['dados e fatos']) }));
      } else if (normalizedSheetName.includes('360')) {
        this.logger.log(`Processando aba de Avaliação 360: "${sheetName}"`);
        rows.forEach(row => allRecords.push({ userEmail, cycleName: cycleName.toString(), evaluationType: 'PEER', evaluatorEmail: findValue(row, ['email do avaliado']), project: findValue(row, ['projeto em que atuaram juntos']), motivatedToWorkAgain: findValue(row, ['motivado em trabalhar novamente']), generalScore: findValue(row, ['nota geral']), pointsToImprove: findValue(row, ['pontos que deve melhorar']), pointsToExplore: findValue(row, ['pontos que faz bem']) }));
      } else if (normalizedSheetName.includes('referências')) {
        this.logger.log(`Processando aba de Pesquisa de Referências: "${sheetName}"`);
        rows.forEach(row => allRecords.push({ userEmail, cycleName: cycleName.toString(), evaluationType: 'REFERENCE', indicatedEmail: findValue(row, ['email da referência']), justification: findValue(row, ['justificativa']) }));
      }
    }
    this.logger.log(`Extração para ${file.originalname} concluída. Total de ${allRecords.length} registros encontrados.`);
    return allRecords;
  }
  
  async importHistory(importData: ImportHistoryDto) {
    let processedCount = 0;
    let createdUserCount = 0;
    let skippedCount = 0;
    const errors = [];
    for (const record of importData.records) {
      try {
        if (!record.userEmail || !record.cycleName || !record.evaluationType) {
          errors.push(`Registro ignorado por falta de campos essenciais.`);
          continue;
        }
        const { id: userId, wasCreated: userWasCreated } = await this.findOrCreateUser(record.userEmail);
        if (userWasCreated) createdUserCount++;
        const cycle = await this.prisma.evaluationCycle.upsert({
          where: { name: record.cycleName.toString() },
          update: {},
          create: { name: record.cycleName.toString(), startDate: new Date(), endDate: new Date(), status: "Fechado" },
        });

        switch (record.evaluationType) {
          case 'SELF':
            if (!record.criterionName) { errors.push(`Registro SELF para ${record.userEmail} ignorado: 'criterionName' em falta.`); continue; }
            const criterion = await this.prisma.evaluationCriterion.upsert({ where: { criterionName: record.criterionName }, update: {}, create: { criterionName: record.criterionName, pillar: "Comportamento" } });
            
            const existingSelfEval = await this.prisma.selfEvaluation.findUnique({
              where: { userId_cycleId_criterionId: { userId, cycleId: cycle.id, criterionId: criterion.id } }
            });

            if (!existingSelfEval) {
              await this.prisma.selfEvaluation.create({ data: { userId, cycleId: cycle.id, criterionId: criterion.id, score: Number(record.score) || 0, justification: record.justification || 'N/A', scoreDescription: record.scoreDescription || '', submissionStatus: 'Concluído' } });
              processedCount++;
            } else {
              this.logger.warn(`[DUPLICADO IGNORADO] Autoavaliação para ${record.userEmail} com critério "${record.criterionName}" já existe.`);
              skippedCount++;
            }
            break;

          case 'PEER':
            if (!record.evaluatorEmail) { errors.push(`Registro PEER para ${record.userEmail} ignorado: 'evaluatorEmail' em falta.`); continue; }
            const { id: evaluatorUserId, wasCreated: evaluatorWasCreated } = await this.findOrCreateUser(record.evaluatorEmail);
            if (evaluatorWasCreated) createdUserCount++;
            
            const existingPeerEval = await this.prisma.peerEvaluation.findFirst({ where: { evaluatedUserId: userId, evaluatorUserId, cycleId: cycle.id } });
            if (!existingPeerEval) {
              await this.prisma.peerEvaluation.create({ data: { evaluatedUserId: userId, evaluatorUserId, cycleId: cycle.id, project: record.project, motivatedToWorkAgain: record.motivatedToWorkAgain, generalScore: Number(record.generalScore) || 0, pointsToImprove: record.pointsToImprove || 'N/A', pointsToExplore: record.pointsToExplore || 'N/A' } });
              processedCount++;
            } else {
              this.logger.warn(`[DUPLICADO IGNORADO] Avaliação de par de ${record.evaluatorEmail} para ${record.userEmail} já existe.`);
              skippedCount++;
            }
            break;

          case 'REFERENCE':
            if (!record.indicatedEmail) { errors.push(`Registro REFERENCE para ${record.userEmail} ignorado: 'indicatedEmail' em falta.`); continue; }
            const { id: indicatedUserId, wasCreated: indicatedWasCreated } = await this.findOrCreateUser(record.indicatedEmail);
            if (indicatedWasCreated) createdUserCount++;
            
            const existingRef = await this.prisma.referenceIndication.findFirst({ where: { indicatorUserId: userId, indicatedUserId, cycleId: cycle.id } });
            if (!existingRef) {
              await this.prisma.referenceIndication.create({ data: { indicatorUserId: userId, indicatedUserId, cycleId: cycle.id, justification: record.justification || 'N/A' } });
              processedCount++;
            } else {
              this.logger.warn(`[DUPLICADO IGNORADO] Indicação de referência de ${record.userEmail} para ${record.indicatedEmail} já existe.`);
              skippedCount++;
            }
            break;
        }
      } catch (error) {
          const message = `Falha ao importar registro para ${record.userEmail} (Tipo: ${record.evaluationType}): ${error.message}`;
          this.logger.error(message, error.stack);
          errors.push(message);
      }
    }
    const message = `Importação concluída. Registros processados: ${processedCount}. Registros duplicados ignorados: ${skippedCount}. Novos usuários criados: ${createdUserCount}. Erros: ${errors.length}.`;
    this.logger.log(message);
    return { message, errors, processed: processedCount, skipped: skippedCount, createdUsers: createdUserCount };
  }
  
  private async findOrCreateUser(email: string): Promise<{ id: string, wasCreated: boolean }> {
    if (!email || typeof email !== 'string') {
      throw new Error(`Email inválido fornecido: ${email}`);
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      return { id: user.id, wasCreated: false };
    }
    this.logger.log(`Usuário com email ${email} não encontrado. Criando novo usuário.`);
    const initialPassword = randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const newUser = await this.prisma.user.create({ data: { email, name: email.split('@')[0], userType: UserType.COLABORADOR, passwordHash } });
    try {
      await this.emailService.sendWelcomeEmail(newUser.email, initialPassword);
    } catch (emailError) {
      this.logger.warn(`Falha ao enviar e-mail de boas-vindas para ${newUser.email}, mas o usuário foi criado.`);
    }
    return { id: newUser.id, wasCreated: true };
  }
}
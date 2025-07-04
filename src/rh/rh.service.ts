import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EvaluationCycle, Prisma, UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import * as XLSX from 'xlsx';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { GetEvaluationsQueryDto } from './dto/get-evaluations-query.dto';
import { HistoryItemDto } from './dto/import-history.dto';
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
    const { page, limit, cycleId, search, status, department, track } = queryDto;

    const targetCycles = await this._getTargetCycles(cycleId);
    if (targetCycles.length === 0) {
      return {
        data: [],
        pagination: { totalItems: 0, totalPages: 0, currentPage: page },
      };
    }
    
    const allUsers = await this.prisma.user.findMany({
      where: { isActive: true },
      include: { roles: true },
    });

    const completedEvaluations = await this.prisma.selfEvaluation.findMany({
        where: { cycleId: { in: targetCycles.map(c => c.id) } },
        distinct: ['userId', 'cycleId'],
        select: { userId: true, cycleId: true },
    });
    
    const completedSet = new Set(completedEvaluations.map(ev => `${ev.userId}-${ev.cycleId}`));

    let allPossibleEvaluations = [];

    for (const cycle of targetCycles) {
      for (const user of allUsers) {
        const departmentRole = user.roles.find(r => r.type === 'CARGO');
        const trackRole = user.roles.find(r => r.type === 'TRILHA');
        
        const isCompleted = completedSet.has(`${user.id}-${cycle.id}`);
        const isOverdue = new Date() > new Date(cycle.endDate);
        
        let userStatus: string;
        if (isCompleted) {
            userStatus = 'Concluída';
        } else if (isOverdue) {
            userStatus = 'Em Atraso';
        } else {
            userStatus = 'Pendente';
        }

        allPossibleEvaluations.push({
          id: `${user.id}-${cycle.id}`,
          collaborator: user.name,
          department: departmentRole?.name || 'N/A',
          track: trackRole?.name || 'N/A',
          status: userStatus,
          progress: isCompleted ? 100 : 0,
          deadline: cycle.endDate,
          completedAt: null, 
          cycleId: cycle.id,
          cycleName: cycle.name,
        });
      }
    }

    const filteredEvaluations = allPossibleEvaluations.filter(ev => {
        const searchMatch = !search || ev.collaborator.toLowerCase().includes(search.toLowerCase());
        const statusMatch = !status || ev.status === status;
        const departmentMatch = !department || ev.department.toLowerCase().includes(department.toLowerCase());
        const trackMatch = !track || ev.track.toLowerCase().includes(track.toLowerCase());
        return searchMatch && statusMatch && departmentMatch && trackMatch;
    });

    const totalItems = filteredEvaluations.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedData = filteredEvaluations.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedData,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
      },
    };
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
      return [];
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

    // Nova lógica: agrupa registros por usuário
    const allRecordsByUser = new Map<string, HistoryItemDto[]>();
    const results = [];

    for (const file of files) {
      let status = 'Sucesso';
      let extractedRecords = 0;
      try {
        this.logger.log(`Processando arquivo: ${file.originalname}`);
        const records = this.extractHistoryRecordsFromFile(file);
        extractedRecords = records.length;

        if (records.length > 0) {
          const userEmail = records[0].userEmail;
          if (!allRecordsByUser.has(userEmail)) {
            allRecordsByUser.set(userEmail, []);
          }
          allRecordsByUser.get(userEmail).push(...records);
        } else {
          this.logger.warn(`Nenhum registro de histórico válido foi extraído do arquivo ${file.originalname}.`);
        }

      } catch (error) {
        status = 'Falha Total';
        this.logger.error(`Falha crítica ao processar o arquivo ${file.originalname}: ${error.message}`, error.stack);
        results.push({ file: file.originalname, message: error.message, errors: [error.message], processed: 0, skipped: 0, createdUsers: 0 });
      } finally {
        await this.prisma.importHistory.create({
          data: { fileName: file.originalname, status: status, file: file.buffer },
        });
        this.logger.log(`Arquivo ${file.originalname} processado com status: ${status}. Registros extraídos: ${extractedRecords}`);
      }
    }

    // Processa todos os registros agrupados por usuário
    if (allRecordsByUser.size > 0) {
      const importResult = await this.importHistory(allRecordsByUser);
      results.push({
        file: 'Processamento consolidado',
        ...importResult
      });
    }

    return results;
  }
  
  private extractHistoryRecordsFromFile(file: Express.Multer.File): HistoryItemDto[] {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const findValue = (row: any, keys: string[]) => {
      for (const key in row) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9]/g, '');
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
    const unidade = findValue(profileData[0], ['unidade', 'unit']);

    if (!userEmail || !cycleName) {
      this.logger.warn(`Não foi possível extrair e-mail ou nome do ciclo da aba 'Perfil' em ${file.originalname}.`);
      return [];
    }
    
    const allRecords: HistoryItemDto[] = [];
    for (const sheetName of workbook.SheetNames) {
      // Melhora na verificação de abas relevantes
      if (!['autoavaliação', 'avaliação 360', 'pesquisa de referências', '360'].some(term => sheetName.toLowerCase().includes(term))) {
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      if (rows.length === 0) continue;

      const normalizedSheetName = sheetName.toLowerCase();
      
      rows.forEach(row => {
        let record: Partial<HistoryItemDto> = {
          userEmail,
          cycleName: cycleName.toString(),
          unidade,
        };

        if (normalizedSheetName.includes('autoavaliação')) {
          record.evaluationType = 'SELF';
          record.criterionName = findValue(row, ['critério']);
          record.score = Number(findValue(row, ['auto-avaliação', 'autoavaliacao']));
          record.scoreDescription = findValue(row, ['descrição nota', 'descriçãonota']);
          record.justification = findValue(row, ['dados e fatos']);
        } else if (normalizedSheetName.includes('360')) {
          record.evaluationType = 'PEER';
          record.evaluatorEmail = findValue(row, ['email do avaliado', 'emaildoavaliado']);
          record.project = findValue(row, ['projeto em que atuaram juntos']);
          record.motivatedToWorkAgain = findValue(row, ['motivado em trabalhar novamente']);
          record.generalScore = Number(findValue(row, ['nota geral']));
          record.pointsToImprove = findValue(row, ['pontos que deve melhorar']);
          record.pointsToExplore = findValue(row, ['pontos que faz bem']);
        } else if (normalizedSheetName.includes('referências')) {
          record.evaluationType = 'REFERENCE';
          record.indicatedEmail = findValue(row, ['email da referência']);
          record.justification = findValue(row, ['justificativa']);
        }

        if (record.evaluationType) {
          allRecords.push(record as HistoryItemDto);
        }
      });
    }
    this.logger.log(`Extração para ${file.originalname} concluída. Total de ${allRecords.length} registros encontrados.`);
    return allRecords;
  }

  async importHistory(allRecordsByUser: Map<string, HistoryItemDto[]>) {
    let processedCount = 0;
    let createdUserCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const [userEmail, records] of allRecordsByUser.entries()) {
      try {
        // Determina o tipo de usuário baseado nas autoavaliações
        let determinedUserType: UserType = UserType.COLABORADOR;
        const selfEvals = records.filter(r => r.evaluationType === 'SELF');

        const isManager = selfEvals.some(r => 
          (r.criterionName?.includes('Gestão de Pessoas*') || 
           r.criterionName?.includes('Gestão de Projetos*') || 
           r.criterionName?.includes('Gestão Organizacional*'))
          && r.scoreDescription !== 'Não se Aplica'
        );
        
        const isRh = selfEvals.some(r => 
          (r.criterionName?.includes('Novos Clientes**') || 
           r.criterionName?.includes('Novos Projetos**') || 
           r.criterionName?.includes('Novos Produtos ou Serviços**'))
          && r.scoreDescription !== 'Não se Aplica'
        );

        if (isRh) {
          determinedUserType = UserType.RH;
        } else if (isManager) {
          determinedUserType = UserType.GESTOR;
        }

        this.logger.log(`Perfil final determinado para ${userEmail}: ${determinedUserType}`);
        
        const { id: userId, wasCreated: userWasCreated } = await this.findOrCreateUser(userEmail, determinedUserType, records[0].unidade);
        if (userWasCreated) createdUserCount++;
        
        for (const record of records) {
          try {
            if (!record.userEmail || !record.cycleName || !record.evaluationType) {
              errors.push(`Registro ignorado por falta de campos essenciais.`);
              continue;
            }
            
            const cycle = await this.prisma.evaluationCycle.upsert({
              where: { name: record.cycleName.toString() },
              update: {},
              create: { name: record.cycleName.toString(), startDate: new Date(), endDate: new Date(), status: 'Fechado' },
            });

            switch (record.evaluationType) {
              case 'SELF':
                if (!record.criterionName) {
                  errors.push(`Registro SELF para ${record.userEmail} ignorado: 'criterionName' em falta.`);
                  skippedCount++;
                  continue;
                }
                const criterion = await this.prisma.evaluationCriterion.upsert({
                  where: { criterionName: record.criterionName },
                  update: {},
                  create: { criterionName: record.criterionName, pillar: 'Comportamento' },
                });

                const existingSelfEval = await this.prisma.selfEvaluation.findUnique({
                  where: { userId_cycleId_criterionId: { userId, cycleId: cycle.id, criterionId: criterion.id } },
                });

                if (!existingSelfEval) {
                  await this.prisma.selfEvaluation.create({
                    data: {
                      userId,
                      cycleId: cycle.id,
                      criterionId: criterion.id,
                      score: Number(record.score) || 0,
                      justification: record.justification || 'N/A',
                      scoreDescription: record.scoreDescription || '',
                      submissionStatus: 'Concluído',
                    },
                  });
                  processedCount++;
                } else {
                  this.logger.warn(`[DUPLICADO IGNORADO] Autoavaliação para ${record.userEmail} com critério "${record.criterionName}" já existe.`);
                  skippedCount++;
                }
                break;

              case 'PEER':
                if (!record.evaluatorEmail) {
                  errors.push(`Registro PEER para ${record.userEmail} ignorado: 'evaluatorEmail' em falta.`);
                  skippedCount++;
                  continue;
                }
                const { id: evaluatorUserId, wasCreated: evaluatorWasCreated } = await this.findOrCreateUser(
                  record.evaluatorEmail, UserType.COLABORADOR, record.unidade
                );
                if (evaluatorWasCreated) createdUserCount++;

                let projectId: string | undefined = undefined;

                if (record.project) {
                  const projectName = record.project.trim();

                  const existingProject = await this.prisma.project.findFirst({
                    where: { name: projectName, cycleId: cycle.id },
                  });

                  if (existingProject) {
                    projectId = existingProject.id;
                    await this.prisma.project.update({
                      where: { id: projectId },
                      data: {
                        collaborators: {
                          connect: [{ id: userId }, { id: evaluatorUserId }],
                        },
                      },
                    });
                  } else {
                    const adminUser = await this.prisma.user.findFirst({ where: { userType: 'ADMIN' } });
                    if (!adminUser) {
                      errors.push(
                        `Não foi possível criar o projeto "${projectName}" pois nenhum usuário ADMIN foi encontrado para ser o gestor.`,
                      );
                    } else {
                      const newProject = await this.prisma.project.create({
                        data: {
                          name: projectName,
                          cycle: { connect: { id: cycle.id } },
                          manager: { connect: { id: adminUser.id } },
                          collaborators: {
                            connect: [{ id: userId }, { id: evaluatorUserId }],
                          },
                        },
                      });
                      projectId = newProject.id;
                      this.logger.log(`Projeto "${projectName}" criado com ID: ${projectId}`);
                    }
                  }
                }
                
                const existingPeerEval = await this.prisma.peerEvaluation.findFirst({
                  where: { evaluatedUserId: userId, evaluatorUserId, cycleId: cycle.id },
                });

                if (!existingPeerEval) {
                  await this.prisma.peerEvaluation.create({
                    data: {
                      evaluatedUserId: userId,
                      evaluatorUserId,
                      cycleId: cycle.id,
                      project: record.project,
                      projectId: projectId,
                      motivatedToWorkAgain: record.motivatedToWorkAgain,
                      generalScore: Number(record.generalScore) || 0,
                      pointsToImprove: record.pointsToImprove || 'N/A',
                      pointsToExplore: record.pointsToExplore || 'N/A',
                    },
                  });
                  processedCount++;
                } else {
                  this.logger.warn(
                    `[DUPLICADO IGNORADO] Avaliação de par de ${record.evaluatorEmail} para ${record.userEmail} já existe.`,
                  );
                  skippedCount++;
                }
                break;

              case 'REFERENCE':
                if (!record.indicatedEmail) {
                  errors.push(`Registro REFERENCE para ${record.userEmail} ignorado: 'indicatedEmail' em falta.`);
                  skippedCount++;
                  continue;
                }
                const { id: indicatedUserId, wasCreated: indicatedWasCreated } = await this.findOrCreateUser(
                  record.indicatedEmail, UserType.COLABORADOR, record.unidade
                );
                if (indicatedWasCreated) createdUserCount++;

                const existingRef = await this.prisma.referenceIndication.findFirst({
                  where: { indicatorUserId: userId, indicatedUserId, cycleId: cycle.id },
                });
                if (!existingRef) {
                  await this.prisma.referenceIndication.create({
                    data: {
                      indicatorUserId: userId,
                      indicatedUserId,
                      cycleId: cycle.id,
                      justification: record.justification || 'N/A',
                    },
                  });
                  processedCount++;
                } else {
                  this.logger.warn(
                    `[DUPLICADO IGNORADO] Indicação de referência de ${record.userEmail} para ${record.indicatedEmail} já existe.`,
                  );
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
      } catch (error) {
        const message = `Falha ao processar usuário ${userEmail}: ${error.message}`;
        this.logger.error(message, error.stack);
        errors.push(message);
      }
    }
    
    const message = `Importação concluída. Registros processados: ${processedCount}. Registros duplicados ignorados: ${skippedCount}. Novos usuários criados: ${createdUserCount}. Erros: ${errors.length}.`;
    this.logger.log(message);
    return { message, errors, processed: processedCount, skipped: skippedCount, createdUsers: createdUserCount };
  }

  private async findOrCreateUser(email: string, userType: UserType = UserType.COLABORADOR, unidade?: string): Promise<{ id: string; wasCreated: boolean; }> {
    if (!email || typeof email !== 'string') {
      throw new Error(`Email inválido fornecido: ${email}`);
    }
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      if (existingUser.userType !== userType || (unidade && existingUser.unidade !== unidade)) {
        const updatedUser = await this.prisma.user.update({
          where: { email },
          data: { 
            userType, 
            ...(unidade && { unidade }),
          },
        });
        this.logger.log(`Usuário ${email} atualizado para o perfil: ${userType}.`);
        return { id: updatedUser.id, wasCreated: false };
      }
      return { id: existingUser.id, wasCreated: false };
    }
    
    this.logger.log(`Usuário com email ${email} não encontrado. Criando novo usuário com perfil: ${userType}.`);
    const initialPassword = randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const newUser = await this.prisma.user.create({
      data: {
        email,
        name: email.split('@')[0],
        userType: userType,
        passwordHash,
        unidade: unidade, 
      },
    });
    try {
      await this.emailService.sendWelcomeEmail(newUser.email, initialPassword);
    } catch (emailError) {
      this.logger.warn(`Falha ao enviar e-mail de boas-vindas para ${newUser.email}, mas o usuário foi criado.`);
    }
    return { id: newUser.id, wasCreated: true };
  }
}
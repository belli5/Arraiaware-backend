import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EvaluationCycle, UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import * as XLSX from 'xlsx';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { GetEvaluationsQueryDto } from './dto/get-evaluations-query.dto';
import { HistoryItemDto } from './dto/import-history.dto';
import { ImportUsersDto } from './dto/import-users.dto';
import { EvaluationsService } from 'src/evaluations/evaluations.service';

@Injectable()
export class RhService {
  private readonly logger = new Logger(RhService.name);

  constructor(
    private prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly evaluationsService: EvaluationsService,
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
    const selfEvaluations = await this.prisma.selfEvaluation.findMany({ 
      where: { cycleId }, 
      include: { 
        user: { select: { name: true, email: true } }, 
        criterion: { select: { criterionName: true, pillar: true } } 
      } 
    });
    const peerEvaluations = await this.prisma.peerEvaluation.findMany({ 
      where: { cycleId }, 
      include: { 
        evaluatedUser: { select: { name: true } }, 
        evaluatorUser: { select: { name: true } } 
      } 
    });
    const references = await this.prisma.referenceIndication.findMany({ 
      where: { cycleId }, 
      include: { 
        indicatedUser: { select: { name: true } }, 
        indicatorUser: { select: { name: true } } 
      } 
    });
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
      try {
        await this.prisma.importHistory.create({
          data: {
            fileName: file.originalname,
            importDate: new Date(),
            status: 'Sucesso',
            file: file.buffer,
          },
        });
        this.logger.log(`Arquivo ${file.originalname} registrado no histórico de importação.`);
      } catch (error) {
        this.logger.error(`Falha ao registrar o arquivo ${file.originalname} no histórico: ${error.message}`, error.stack);
      }

      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const usersJson: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!usersJson || usersJson.length === 0) {
        this.logger.warn(`Arquivo ${file.originalname} está vazio ou em formato incorreto. Pulando.`);
        continue;
      }

      const mappedUsers = usersJson.map((row, index) => {
        const name = findValue(row, ['nome', 'name']);
        const email = findValue(row, ['email']);
        const unidade = findValue(row, ['unidade', 'unit']);

        if (!name || !email) {
          this.logger.warn(`A linha ${index + 2} do arquivo ${file.originalname} é inválida. Pulando.`);
          return null;
        }

        return { name, email, unidade };
      }).filter(user => user !== null);

      allUsers.push(...mappedUsers);
    }

    if (allUsers.length === 0) {
      throw new BadRequestException("Nenhum registro de usuário válido foi encontrado nos arquivos enviados.");
    }

    return this.importUsers({ users: allUsers });
  }

  async importUsers(dto: ImportUsersDto) {
    let createdCount = 0;
    let existingCount = 0;

    for (const userRecord of dto.users) {
      if (!userRecord || !userRecord.email) {
        this.logger.warn('Registro de usuário inválido pulado:', userRecord);
        continue;
      }

      const initialPassword = randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(initialPassword, 10);

      const user = await this.prisma.user.upsert({
        where: { email: userRecord.email },
        update: { 
          name: userRecord.name, 
          unidade: userRecord.unidade 
        },
        create: { 
          name: userRecord.name, 
          email: userRecord.email, 
          unidade: userRecord.unidade, 
          userType: UserType.COLABORADOR, 
          passwordHash: hashedPassword 
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

    return { 
      message: 'Importação de usuários concluída.', 
      createdUsers: createdCount, 
      existingUsers: existingCount 
    };
  }

  async importHistoryFromMultipleXlsx(files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const allRecordsByUser = new Map<string, HistoryItemDto[]>();

    for (const file of files) {
      try {
        await this.prisma.importHistory.create({
          data: {
            fileName: file.originalname,
            importDate: new Date(),
            status: 'Sucesso',
            file: file.buffer,
          },
        });
        this.logger.log(`Arquivo ${file.originalname} registrado no histórico.`);
        
        const records = this.extractHistoryRecordsFromFile(file);
        
        if (records.length > 0) {
          const userEmail = records[0].userEmail;
          
          if (!allRecordsByUser.has(userEmail)) {
            allRecordsByUser.set(userEmail, []);
          }
          
          allRecordsByUser.get(userEmail).push(...records);
        }
      } catch (error) {
        this.logger.error(`Falha ao extrair ou registrar dados do arquivo ${file.originalname}: ${error.message}`, error.stack);
      }
    }

    return this.importHistory(allRecordsByUser);
  }

  private extractHistoryRecordsFromFile(file: Express.Multer.File): HistoryItemDto[] {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    
    const findValue = (row: any, keys: string[]) => {
      for (const key in row) {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9]/g, '');
        if (keys.some(searchKey => normalizedKey.includes(searchKey.toLowerCase().replace(/[^a-z0-9]/g, '')))) {
          return row[key];
        }
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
      if (!['autoavaliação', 'avaliação 360', 'pesquisa de referências'].some(term => sheetName.toLowerCase().includes(term))) {
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
          record.generalDescription = findValue(row, ['DESCRIÇÃO GERAL']);
          record.score = Number(findValue(row, ['auto-avaliação', 'autoavaliacao']));
          record.scoreDescription = findValue(row, ['descriçãonota']);
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

    return allRecords;
  }

  async importHistory(allRecordsByUser: Map<string, HistoryItemDto[]>) {
    let processedCount = 0;
    let createdUserCount = 0;
    let skippedCount = 0;
    const errors = [];
    const projectManagerMap = new Map<string, string>();

    for (const [userEmail, records] of allRecordsByUser.entries()) {
      let determinedUserType: UserType = UserType.COLABORADOR;
      const selfEvals = records.filter(r => r.evaluationType === 'SELF');

      const isManager = selfEvals.some(r => 
        (r.criterionName?.includes('Gestão de Pessoas*') || 
         r.criterionName?.includes('Gestão de Projetos*') || 
         r.criterionName?.includes('Gestão Organizacional*')) &&
        r.scoreDescription !== 'Não se Aplica'
      );

      const isRh = selfEvals.some(r => 
        (r.criterionName?.includes('Novos Clientes**') || 
         r.criterionName?.includes('Novos Projetos**') || 
         r.criterionName?.includes('Novos Produtos ou Serviços**')) &&
        r.scoreDescription !== 'Não se Aplica'
      );

      if (isRh) {
        determinedUserType = UserType.RH;
      } else if (isManager) {
        determinedUserType = UserType.GESTOR;
      }

      this.logger.log(`Perfil final determinado para ${userEmail}: ${determinedUserType}`);
      
      const { id: userId, wasCreated: userWasCreated } = await this.findOrCreateUser(
        userEmail, 
        determinedUserType, 
        records[0].unidade
      );

      if (userWasCreated) {
        createdUserCount++;
      }

      for (const record of records) {
        try {
          if (!record.userEmail || !record.cycleName || !record.evaluationType) {
            errors.push(`Registro ignorado por falta de campos essenciais.`);
            skippedCount++;
            continue;
          }
          
          const cycle = await this.prisma.evaluationCycle.upsert({
            where: { name: record.cycleName.toString() },
            update: {},
            create: { 
              name: record.cycleName.toString(), 
              startDate: new Date(), 
              endDate: new Date(), 
              status: 'Fechado' 
            },
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
                create: { 
                  criterionName: record.criterionName, 
                  pillar: 'Comportamento',
                  description: record.generalDescription || 'N/A'
                },
              });

              const existingSelfEval = await this.prisma.selfEvaluation.findUnique({
                where: { 
                  userId_cycleId_criterionId: { 
                    userId, 
                    cycleId: cycle.id, 
                    criterionId: criterion.id 
                  } 
                },
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
                record.evaluatorEmail, 
                UserType.COLABORADOR, 
                record.unidade
              );

              if (evaluatorWasCreated) {
                createdUserCount++;
              }

              let projectId: string | undefined = undefined;

              if (record.project) {
                const projectName = record.project.trim();
                let project = await this.prisma.project.findFirst({
                  where: { 
                    name: projectName, 
                    cycleId: cycle.id 
                  },
                });

                if (!project) {
                  const adminUser = await this.prisma.user.findFirst({ where: { userType: 'ADMIN' } });
                  const managerId = determinedUserType === UserType.GESTOR ? userId : adminUser?.id;

                  if (!managerId) {
                    throw new Error('Nenhum gestor ou admin encontrado para o projeto');
                  }
                  
                  project = await this.prisma.project.create({
                    data: {
                      name: projectName,
                      cycleId: cycle.id,
                      managerId: managerId,
                      collaborators: { connect: { id: userId } } // Conecta o usuário principal
                    },
                  });
                  this.logger.log(`Projeto "${projectName}" criado com gestor ID: ${managerId}`);
                }
                
                projectId = project.id;
                
                // Conecta o avaliador ao projeto
                await this.prisma.project.update({
                  where: { id: project.id },
                  data: { collaborators: { connect: { id: evaluatorUserId } } }
                });

                projectManagerMap.set(project.id, project.managerId);
              }

              const existingPeerEval = await this.prisma.peerEvaluation.findFirst({
                where: { 
                  evaluatedUserId: userId, 
                  evaluatorUserId, 
                  cycleId: cycle.id 
                },
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
                this.logger.warn(`[DUPLICADO IGNORADO] Avaliação de par de ${record.evaluatorEmail} para ${record.userEmail} já existe.`);
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
                record.indicatedEmail, 
                UserType.COLABORADOR, 
                record.unidade
              );

              if (indicatedWasCreated) {
                createdUserCount++;
              }

              const existingRef = await this.prisma.referenceIndication.findFirst({
                where: { 
                  indicatorUserId: userId, 
                  indicatedUserId, 
                  cycleId: cycle.id 
                },
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
    }

    // Atualiza líderes dos colaboradores baseado nos projetos - LÓGICA APRIMORADA
    for (const [projectId, managerId] of projectManagerMap.entries()) {
      if (managerId) {
        const projectWithCollaborators = await this.prisma.project.findUnique({
          where: { id: projectId },
          include: { collaborators: { select: { id: true } } }
        });
        
        if (projectWithCollaborators?.collaborators) {
          const collaboratorIds = projectWithCollaborators.collaborators
            .map(c => c.id)
            .filter(id => id !== managerId);
          
          if (collaboratorIds.length > 0) {
            await this.prisma.user.updateMany({
              where: { id: { in: collaboratorIds } },
              data: { leaderId: managerId }
            });
            this.logger.log(`Líder ${managerId} associado a ${collaboratorIds.length} colaboradores do projeto ${projectId}.`);
          }
        }
      }
    }
    this.logger.log('Iniciando a criação de avaliações implícitas (Líder/Liderado)...');
    await this.createImplicitEvaluations(allRecordsByUser);

    const message = `Importação concluída. Registros processados: ${processedCount}. Registros duplicados ignorados: ${skippedCount}. Novos usuários criados: ${createdUserCount}. Erros: ${errors.length}.`;
    this.logger.log(message);
    
    return { 
      message, 
      errors, 
      processed: processedCount, 
      skipped: skippedCount, 
      createdUsers: createdUserCount 
    };
  }

  private async createImplicitEvaluations(allRecordsByUser: Map<string, HistoryItemDto[]>) {
    for (const [userEmail, records] of allRecordsByUser.entries()) {
      try {
        const user = await this.prisma.user.findUnique({ where: { email: userEmail } });
        const cycle = await this.prisma.evaluationCycle.findUnique({ where: { name: records[0].cycleName.toString() } });

        if (!user || !user.leaderId || !cycle) {
          continue;
        }

        const selfEvals = await this.prisma.selfEvaluation.findMany({ where: { userId: user.id, cycleId: cycle.id } });
        const peerEvals = await this.prisma.peerEvaluation.findMany({ where: { evaluatedUserId: user.id, cycleId: cycle.id } });

        const selfScores = selfEvals.map(e => e.score);
        const peerScores = peerEvals.map(e => e.generalScore);
        const allScores = [...selfScores, ...peerScores];

        if (allScores.length > 0) {
          const averageScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
          const leaderEvalDto = {
            leaderId: user.leaderId,
            collaboratorId: user.id,
            cycleId: cycle.id,
            deliveryScore: averageScore,
            proactivityScore: averageScore,
            collaborationScore: averageScore,
            skillScore: averageScore,
            justification: 'Avaliação gerada automaticamente a partir da média das autoavaliações e avaliações de pares.',
          };
          
          const existingLeaderEval = await this.prisma.leaderEvaluation.findFirst({
            where: { leaderId: user.leaderId, collaboratorId: user.id, cycleId: cycle.id }
          });

          if (!existingLeaderEval) {
            await this.evaluationsService.submitLeaderEvaluation(leaderEvalDto);
            this.logger.log(`Avaliação de LÍDER para ${user.email} criada com nota média ${averageScore}.`);
          }
        }

        const directReportEvalDto = {
          collaboratorId: user.id,
          leaderId: user.leaderId,
          cycleId: cycle.id,
          visionScore: 3,
          inspirationScore: 3,
          developmentScore: 3,
          feedbackScore: 3,
        };

        const existingDirectReportEval = await this.prisma.directReportEvaluation.findFirst({
          where: { collaboratorId: user.id, leaderId: user.leaderId, cycleId: cycle.id }
        });

        if (!existingDirectReportEval) {
          await this.evaluationsService.submitDirectReportEvaluation(directReportEvalDto);
          this.logger.log(`Avaliação de LIDERADO (${user.email}) para LÍDER criada com notas neutras.`);
        }
      } catch (error) {
        this.logger.error(`Falha ao criar avaliação implícita para ${userEmail}: ${error.message}`, error.stack);
      }
    }
  }

  private async findOrCreateUser(
    email: string, 
    userType: UserType = UserType.COLABORADOR, 
    unidade?: string
  ): Promise<{ id: string; wasCreated: boolean }> {
    if (!email || typeof email !== 'string') {
      throw new Error(`Email inválido fornecido: ${email}`);
    }

    const existingUser = await this.prisma.user.findUnique({ 
      where: { email } 
    });

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
        userType,
        passwordHash,
        unidade,
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
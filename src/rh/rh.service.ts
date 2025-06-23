// src/rh/rh.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { GetEvaluationsQueryDto } from './dto/get-evaluations-query.dto';
import { ImportHistoryDto } from './dto/import-history.dto';
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
        criterion: { select: { criterionName: true } },
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

    const where: Prisma.UserWhereInput = {
      isActive: true,
    };

    const filterConditions: Prisma.UserWhereInput[] = [];

    if (department) {
      filterConditions.push({
        role: { type: { equals: department } },
      });
    }

    if (search) {
      filterConditions.push({
        OR: [
          { name: { contains: search } },
          { role: { name: { contains: search } } },
        ],
      });
    }

    if (filterConditions.length > 0) {
      where.AND = filterConditions;
    }
    const completedUserIds = (
      await this.prisma.selfEvaluation.findMany({
        where: { cycleId: currentCycle.id },
        distinct: ['userId'],
        select: { userId: true },
      })
    ).map((ev) => ev.userId);

    const isOverdue = new Date() > new Date(currentCycle.endDate);

    if (status === 'Concluída') {
      where.id = { in: completedUserIds };
    } else if (status === 'Pendente') {
      where.id = { notIn: completedUserIds };
    } else if (status === 'Em Atraso') {
      if (!isOverdue)
        return { data: [], pagination: { totalItems: 0, totalPages: 0, currentPage: page } };
      where.id = { notIn: completedUserIds };
    }

    const [totalItems, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: { role: true },
      }),
    ]);

    const data = users.map((user) => {
      const userStatus = completedUserIds.includes(user.id)
        ? 'Concluída'
        : isOverdue
          ? 'Em Atraso'
          : 'Pendente';

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

    return {
      data,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
      },
    };
  }

  async importUsers(dto: ImportUsersDto) {
    let createdCount = 0;
    let existingCount = 0;

    for (const userRecord of dto.users) {
      
      const initialPassword = randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(initialPassword, 10);

      const user = await this.prisma.user.upsert({
        where: { email: userRecord.email },
        update: {},
        create: {
          name: userRecord.name,
          email: userRecord.email,
          unidade: userRecord.unidade,
          userType: 'Colaborador',
          passwordHash: hashedPassword, 
        },
      });

      const wasJustCreated = new Date().getTime() - user.createdAt.getTime() < 3000;

      if (wasJustCreated) {
        createdCount++;
        await this.emailService.sendWelcomeEmail(user.email, initialPassword);
        console.log(`Usuário ${user.email} criado. E-mail de boas-vindas disparado.`);
      } else {
        existingCount++;
        console.log(`Usuário ${user.email} já existe. Não enviando e-mail de boas-vindas.`);
      }
    }

    return {
      message: 'Importação de usuários concluída.',
      createdUsers: createdCount,
      existingUsers: existingCount,
    };
  }

  async importHistory(importData: ImportHistoryDto) {
    let createdEvaluationCount = 0;
    let createdUserCount = 0;

    for (const record of importData.records) {
      const cycle = await this.prisma.evaluationCycle.findFirst({ where: { name: record.cycleName } });
      const criterion = await this.prisma.evaluationCriterion.findFirst({ where: { criterionName: record.criterionName } });

      if (!cycle || !criterion) {
        console.warn(`Ciclo ou critério não encontrado para o registro:`, record);
        continue;
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email: record.userEmail },
      });

      let user = existingUser;

      if (!user) {
        const initialPassword = randomBytes(8).toString('hex');
        const passwordHash = await bcrypt.hash(initialPassword, 10);

        user = await this.prisma.user.create({
          data: {
            email: record.userEmail,
            name: record.userEmail.split('@')[0],
            userType: 'Colaborador',
            passwordHash: passwordHash,
          },
        });

        createdUserCount++;

        await this.emailService.sendWelcomeEmail(user.email, initialPassword);
      }

      if (record.evaluationType === 'SELF') {
        await this.prisma.selfEvaluation.upsert({
          where: {
            userId_cycleId_criterionId: {
              userId: user.id,
              cycleId: cycle.id,
              criterionId: criterion.id,
            },
          },
          update: {
            score: record.score,
            justification: record.justification,
            submissionStatus: 'Concluído',
          },
          create: {
            userId: user.id,
            cycleId: cycle.id,
            criterionId: criterion.id,
            score: record.score,
            justification: record.justification,
            submissionStatus: 'Concluído',
          },
        });
        createdEvaluationCount++;
      } else if (record.evaluationType === 'PEER') {
        const evaluatorUser = await this.prisma.user.findUnique({
          where: { email: record.evaluatorEmail },
        });

        if (!evaluatorUser) {
          console.warn(`Avaliador com e-mail ${record.evaluatorEmail} não encontrado para avaliação PEER. Pulando registro.`, record);
          continue;
        }

        await this.prisma.peerEvaluation.upsert({
          where: {
            evaluatedUserId_evaluatorUserId_cycleId_criterionId: {
              evaluatedUserId: user.id,
              evaluatorUserId: evaluatorUser.id,
              cycleId: cycle.id,
              criterionId: criterion.id,
            },
          },
          update: {
            score: record.score,
            justification: record.justification,
          },
          create: {
            evaluatedUserId: user.id,
            evaluatorUserId: evaluatorUser.id,
            cycleId: cycle.id,
            criterionId: criterion.id,
            score: record.score,
            justification: record.justification,
          },
        });
        createdEvaluationCount++;
      }
    }

    return {
      message: `${createdEvaluationCount} registros de avaliação importados e ${createdUserCount} novos usuários criados com sucesso.`,
    };
  }
}
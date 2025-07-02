import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserType } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { CyclesService } from '../cycles/cycles.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { ErpUserDto } from './dto/erp-user.dto';

@Injectable()
export class ErpService {
  private readonly logger = new Logger(ErpService.name);
  private readonly ERP_API_URL: string;
  private readonly ERP_API_TOKEN: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly projectsService: ProjectsService,
    private readonly cyclesService: CyclesService,
    private readonly prisma: PrismaService,
  ) {
    this.ERP_API_URL = this.configService.get<string>('ERP_API_URL');
    this.ERP_API_TOKEN = this.configService.get<string>('ERP_API_TOKEN');
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  handleCron() {
    this.logger.log('Executando tarefa agendada de sincronização do ERP.');
    this.syncDataFromErp();
  }

  async syncDataFromErp() {
    this.logger.log('Iniciando sincronização de dados com o ERP.');

    try {
      const erpUsers = await this.fetchUsersFromErp();
      if (!erpUsers || erpUsers.length === 0) {
        this.logger.warn('Nenhum dado de usuário retornado pelo ERP. Sincronização abortada.');
        return;
      }

      const activeCycle = await this.cyclesService.findActiveCycle();
      if (!activeCycle) {
        this.logger.warn('Nenhum ciclo de avaliação ativo encontrado. Projetos não serão sincronizados.');
        return;
      }

      const leaders = new Map<string, Partial<ErpUserDto>>();
      const projects = new Map<string, { name: string; managerId: string; cycleId: string; collaboratorIds: Set<string> }>();

      for (const erpUser of erpUsers) {
        if (erpUser.id_lider && !leaders.has(erpUser.id_lider)) {
          leaders.set(erpUser.id_lider, {
            id_colaborador: erpUser.id_lider,
            nome_completo: erpUser.nome_lider,
            email_corporativo: `${erpUser.nome_lider.replace(/\s+/g, '.').toLowerCase()}@rocketcorp.com`,
            unidade_negocio: erpUser.unidade_negocio,
          });
        }

        if (!projects.has(erpUser.id_projeto)) {
          projects.set(erpUser.id_projeto, {
            name: erpUser.nome_projeto,
            managerId: erpUser.id_lider,
            cycleId: activeCycle.id,
            collaboratorIds: new Set(),
          });
        }
        projects.get(erpUser.id_projeto).collaboratorIds.add(erpUser.id_colaborador);
      }

      const allUsersToSync = [...erpUsers, ...Array.from(leaders.values())];
      await this.syncUsers(allUsersToSync);

      await this.syncProjects(projects);

      this.logger.log('Sincronização com o ERP concluída com sucesso.');

    } catch (error) {
      this.logger.error('Falha na sincronização com o ERP.', error.stack);
    }
  }

  private async fetchUsersFromErp(): Promise<ErpUserDto[]> {
    const headers = { 'Authorization': `Bearer ${this.ERP_API_TOKEN}` };
    const url = `${this.ERP_API_URL}/users`;
    this.logger.log(`Buscando dados de: ${url}`);
    const response = await firstValueFrom(
      this.httpService.get<ErpUserDto[]>(url, { headers }),
    );
    return response.data;
  }

  private async syncUsers(erpUsers: Partial<ErpUserDto>[]) {
    for (const erpUser of erpUsers) {
      const existingUser = await this.usersService.findByEmail(erpUser.email_corporativo);
      const isLeader = !('id_lider' in erpUser);

      const userData = {
        name: erpUser.nome_completo,
        email: erpUser.email_corporativo,
        userType: isLeader ? UserType.GESTOR : UserType.COLABORADOR,
        leaderId: isLeader ? undefined : erpUser.id_lider,
        unidade: erpUser.unidade_negocio,
      };

      if (existingUser) {
        await this.usersService.update(existingUser.id, userData);
      } else {
        await this.usersService.create(userData);
      }
    }
  }

  private async syncProjects(projects: Map<string, any>) {
    for (const projectData of projects.values()) {
        const existingProject = await this.prisma.project.findFirst({
            where: { name: projectData.name, cycleId: projectData.cycleId }
        });

        if (existingProject) {
            await this.prisma.project.update({
                where: { id: existingProject.id },
                data: {
                    collaborators: {
                        set: Array.from(projectData.collaboratorIds).map((id: string) => ({ id }))
                    }
                }
            });
        } else {
            await this.projectsService.create({
                name: projectData.name,
                cycleId: projectData.cycleId,
                managerId: projectData.managerId,
                collaboratorIds: Array.from(projectData.collaboratorIds) as string[],
            });
        }
    }
  }
}
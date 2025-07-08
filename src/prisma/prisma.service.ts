import { Inject, Injectable, InternalServerErrorException, OnModuleInit, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../AuditModule/audit.service';
import { EncryptionService } from '../common/encryption/encryption.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(
    private readonly encryptionService: EncryptionService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {
    super();
    if (!this.user) {
      throw new InternalServerErrorException(
        "Prisma Client não foi gerado corretamente. Por favor, execute 'pnpm prisma generate' no seu terminal.",
      );
    }
  }

  async onModuleInit() {
    await this.$connect();


    this.$use(async (params, next) => {
  
      if (params.model === 'AuditLog') {
        return next(params);
      }

      const writeActions = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert'];
      
      if (writeActions.includes(params.action)) {
        const model = params.model;
        const action = `${params.action.toUpperCase()}_${model}`;
        
        let details: any = { args: params.args };
        
        if ((params.action.startsWith('update') || params.action.startsWith('delete')) && params.args.where) {
            const before = await this[model].findUnique({ where: params.args.where });
            details.before = before;
        }

        const result = await next(params);
        
        details.after = result;

        
        this.auditService.log({
          action: action,
          entity: model,
          entityId: result?.id || params.args?.where?.id,
          details: details,
        });

        return result;
      }
      return next(params);
    });


    this.$use(async (params, next) => {
      const sensitiveFields = {
        SelfEvaluation: ['justification', 'scoreDescription'],
        PeerEvaluation: ['pointsToImprove', 'pointsToExplore', 'motivatedToWorkAgain'],
        ReferenceIndication: ['justification'],
        LeaderEvaluation: ['justification'],
        EqualizationLog: ['observation', 'previousValue', 'newValue'],
        AISummary: ['content'],
      };

      const writeActions = ['create', 'createMany', 'update', 'updateMany', 'upsert'];
      if (writeActions.includes(params.action) && params.args.data) {
          const modelName = params.model;
          if (sensitiveFields[modelName]) {
            const data = Array.isArray(params.args.data) ? params.args.data : [params.args.data];
            for(const item of data) {
                for (const field of sensitiveFields[modelName]) {
                    if (item[field] && typeof item[field] === 'string') {
                        item[field] = this.encryptionService.encrypt(item[field]);
                    }
                }
            }
          }
      }

      const result = await next(params);

      const findActions = ['findUnique', 'findFirst', 'findMany', 'findUniqueOrThrow', 'findFirstOrThrow'];
      if (findActions.includes(params.action) && result) {
        const modelName = params.model;
        if (sensitiveFields[modelName]) {
          const processResult = (item) => {
            if (!item) return item;
            for (const field of sensitiveFields[modelName]) {
              if (item[field] && typeof item[field] === 'string') {
                item[field] = this.encryptionService.decrypt(item[field]);
              }
            }
            return item;
          };

          if (Array.isArray(result)) {
            return result.map(processResult);
          } else {
            return processResult(result);
          }
        }
      }

      return result;
    });
  }
}
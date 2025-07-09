import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../common/encryption/encryption.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(
    private readonly encryptionService: EncryptionService,
    
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();

   
   
   
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
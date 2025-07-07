import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../common/encryption/encryption.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly encryptionService: EncryptionService) {
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
      const sensitiveFields = {
        SelfEvaluation: ['justification', 'scoreDescription'],
        PeerEvaluation: ['pointsToImprove', 'pointsToExplore'],
        ReferenceIndication: ['justification'],
        LeaderEvaluation: ['justification'],
        EqualizationLog: ['observation', 'previousValue', 'newValue'],
        AISummary: ['content'],
      };

      const writeActions = ['create', 'createMany', 'update', 'updateMany', 'upsert'];
      if (writeActions.includes(params.action)) {
        const modelName = params.model;
        if (sensitiveFields[modelName]) {
          const data = params.args.data;
          if (data) {
            for (const field of sensitiveFields[modelName]) {
              if (data[field]) {
                data[field] = this.encryptionService.encrypt(data[field]);
              }
            }
          }
        }
      }

      const result = await next(params);

      const findActions = ['findUnique', 'findFirst', 'findMany'];
      if (findActions.includes(params.action) && result) {
        const modelName = params.model;
        if (sensitiveFields[modelName]) {
          const processResult = (item) => {
            if (!item) return item;
            for (const field of sensitiveFields[modelName]) {
              if (item[field]) {
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

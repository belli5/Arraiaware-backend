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
      
      const sensitiveStringFields = {
        SelfEvaluation: ['justification', 'scoreDescription'],
        PeerEvaluation: ['pointsToImprove', 'pointsToExplore', 'motivatedToWorkAgain'],
        ReferenceIndication: ['justification'],
        LeaderEvaluation: ['justification'],
        EqualizationLog: ['observation', 'previousValue', 'newValue'],
        AISummary: ['content'],
        
      };

      const sensitiveJsonFields = {
        AuditLog: ['details'],
       
      };

      const writeActions = ['create', 'createMany', 'update', 'updateMany', 'upsert'];

    
      if (writeActions.includes(params.action) && params.args.data) {
          const modelName = params.model;
          const data = Array.isArray(params.args.data) ? params.args.data : [params.args.data];

          for(const item of data) {
          
              if (sensitiveStringFields[modelName]) {
                  for (const field of sensitiveStringFields[modelName]) {
                      if (item[field] && typeof item[field] === 'string') {
                          item[field] = this.encryptionService.encrypt(item[field]);
                      }
                  }
              }

             
              if (sensitiveJsonFields[modelName]) {
                  for (const field of sensitiveJsonFields[modelName]) {
                      if (item[field] && typeof item[field] === 'object') {
                          const jsonString = JSON.stringify(item[field]);
                          item[field] = this.encryptionService.encrypt(jsonString);
                      }
                  }
              }
          }
      }

      const result = await next(params);

      const findActions = ['findUnique', 'findFirst', 'findMany', 'findUniqueOrThrow', 'findFirstOrThrow'];
    
      if (findActions.includes(params.action) && result) {
        const modelName = params.model;

        const processResult = (item) => {
          if (!item) return item;

 
          if (sensitiveStringFields[modelName]) {
            for (const field of sensitiveStringFields[modelName]) {
              if (item[field] && typeof item[field] === 'string') {
                item[field] = this.encryptionService.decrypt(item[field]);
              }
            }
          }

     
          if (sensitiveJsonFields[modelName]) {
            for (const field of sensitiveJsonFields[modelName]) {
              if (item[field] && typeof item[field] === 'string') {
                const decryptedString = this.encryptionService.decrypt(item[field]);
                try {
                
                  item[field] = JSON.parse(decryptedString);
                } catch (e) {

                  item[field] = decryptedString;
                }
              }
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

      return result;
    });
  }
}

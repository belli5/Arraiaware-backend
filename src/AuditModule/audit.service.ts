import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogData {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(forwardRef(() => PrismaService))
    private prisma: PrismaService,
  ) {}

  async log(data: AuditLogData) {
    this.logger.log(`Audit Log: User ${data.userId || 'System'} | Action: ${data.action} | Entity: ${data.entity} (${data.entityId || ''})`);

    await this.prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        userId: data.userId,
        details: data.details || undefined,
        ipAddress: data.ipAddress,
      },
    });
  }
}
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('Audit Log')
@Controller('api/audit-logs')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserType.ADMIN) 
  @ApiOperation({ summary: 'Listar todos os registos de auditoria' })
  findAll() {
    return this.auditService.findAll();
  }
}
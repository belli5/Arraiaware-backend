import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ErpService } from './erp.service';

@ApiTags('ERP Integration')
@Controller('api/erp')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class ErpController {
  constructor(private readonly erpService: ErpService) {}

  @Post('sync')
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Dispara a sincronização manual de dados com o ERP' })
  triggerSync() {
    this.erpService.syncDataFromErp();
    return { message: 'A sincronização com o ERP foi iniciada em segundo plano.' };
  }
}
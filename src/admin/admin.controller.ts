import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Audit } from 'src/AuditModule/dto/audit.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';

@ApiTags('Admin')
@Controller('api/admin')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch('users/:userId/permissions')
  @Roles(UserType.ADMIN)
  @Audit('UPDATE_USER_PERMISSIONS')
  @ApiOperation({
    summary: 'Define as permissões de um usuário (Admin)',
    description:
      'Permite que um administrador altere o tipo de usuário (userType) e/ou os papéis (roleIds) de outro usuário.',
  })
  @ApiResponse({ status: 200, description: 'Permissões do usuário atualizadas com sucesso.' })
  @ApiResponse({ status: 403, description: 'Acesso negado. Apenas administradores podem executar esta ação.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  updateUserPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateUserPermissionsDto: UpdateUserPermissionsDto,
  ) {
    return this.adminService.updateUserPermissions(
      userId,
      updateUserPermissionsDto,
    );
  }
}
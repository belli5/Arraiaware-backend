import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Criar um novo usuário' })
  @ApiResponse({ status: 201, description: 'O usuário foi criado com sucesso.'})
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.'})
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiResponse({ status: 200, description: 'Lista de usuários retornada com sucesso.'})
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar um usuário pelo ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado.'})
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.'})
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Atualizar um usuário pelo ID' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso.'})
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.'})
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Deletar um usuário pelo ID' })
  @ApiResponse({ status: 200, description: 'Usuário deletado com sucesso.'})
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.'})
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  @Patch('me/change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alterar a senha do usuário logado' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso.'})
  @ApiResponse({ status: 401, description: 'A senha atual está incorreta.'})
  changeMyPassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  @Patch(':id/reset-password')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.RH)
  @ApiOperation({ summary: 'Resetar a senha de um usuário (Admin/RH)' })
  @ApiResponse({ status: 200, description: 'Senha resetada e enviada por e-mail com sucesso.'})
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.'})
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.resetPassword(id);
  }
}
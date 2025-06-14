import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@Controller('api/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo cargo/trilha' })
  @ApiResponse({ status: 201, description: 'Cargo criado com sucesso.' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os cargos/trilhas' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um cargo/trilha pelo ID' })
  @ApiResponse({ status: 404, description: 'Cargo não encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um cargo/trilha' })
  @ApiResponse({ status: 404, description: 'Cargo não encontrado.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar um cargo/trilha' })
  @ApiResponse({ status: 200, description: 'Cargo deletado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Cargo não encontrado.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.remove(id);
  }
}
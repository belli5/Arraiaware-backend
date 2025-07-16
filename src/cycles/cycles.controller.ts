import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Audit } from 'src/AuditModule/dto/audit.decorator';
import { CyclesService } from './cycles.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';

@ApiTags('Cycles')
@Controller('api/cycles')
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Post()
  @Audit('CREATE_CYCLE')
  @ApiOperation({ summary: 'Criar um novo ciclo de avaliação' })
  @ApiResponse({ status: 201, description: 'Ciclo criado e aberto com sucesso.'})
  create(@Body() createCycleDto: CreateCycleDto) {
    return this.cyclesService.create(createCycleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os ciclos de avaliação' })
  findAll() {
    return this.cyclesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um ciclo pelo ID' })
  @ApiResponse({ status: 404, description: 'Ciclo não encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.cyclesService.findOne(id);
  }

  @Patch(':id')
  @Audit('UPDATE_CYCLE_STATUS')
  @ApiOperation({ summary: 'Atualizar um ciclo (ex: para fechar o status)' })
  @ApiResponse({ status: 404, description: 'Ciclo não encontrado.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateCycleDto: UpdateCycleDto) {
    return this.cyclesService.update(id, updateCycleDto);
  }

  @Delete(':id')
  @Audit('DELETE_CYCLE')
  @ApiOperation({ summary: 'Deletar um ciclo de avaliação' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cyclesService.remove(id);
  }
}
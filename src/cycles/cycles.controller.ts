import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { CyclesService } from './cycles.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Cycles')
@Controller('api/cycles')
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Post()
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
  @ApiOperation({ summary: 'Atualizar um ciclo (ex: para fechar o status)' })
  @ApiResponse({ status: 404, description: 'Ciclo não encontrado.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateCycleDto: UpdateCycleDto) {
    return this.cyclesService.update(id, updateCycleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar um ciclo de avaliação' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.cyclesService.remove(id);
  }
}
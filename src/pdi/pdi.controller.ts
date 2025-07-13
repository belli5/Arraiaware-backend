import { Controller, Post, Get, Body, Param, ParseUUIDPipe, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { PdiService } from './pdi.service';
import { CreatePdiDto } from './dto/create-pdi.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UpdatePdiDto } from './dto/update-pdi.dto';

@ApiTags('PDIs')
@Controller('api/pdis')
export class PdiController {
  constructor(private readonly pdiService: PdiService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo item no Plano de Desenvolvimento Individual' })
  create(@Body() createPdiDto: CreatePdiDto) {
    return this.pdiService.create(createPdiDto);
  }

  @Get('user/:userId/cycle/:cycleId')
  @ApiOperation({ summary: 'Buscar PDIs de um usuário por ciclo' })
  findForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.pdiService.findForUser(userId, cycleId);
  }

  @Get('ai-suggestions/user/:userId/cycle/:cycleId')
  @ApiOperation({ summary: 'Obter sugestões de PDI baseadas em IA' })
  getAiSuggestions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.pdiService.getAiSuggestions(userId, cycleId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um item do PDI' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePdiDto) {
    return this.pdiService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar um item do PDI' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pdiService.remove(id);
  }
}
import { Controller, Post, Get, Body, Param, ParseUUIDPipe, Patch, HttpCode, Delete, HttpStatus } from '@nestjs/common';
import { OkrService } from './okr.service';
import { CreateOkrDto } from './dto/create-okr.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UpdateKeyResultDto, UpdateObjectiveDto } from './dto/update-okr.dto';

@ApiTags('OKRs')
@Controller('api/okrs')
export class OkrController {
  constructor(private readonly okrService: OkrService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo OKR para um usuário' })
  create(@Body() createOkrDto: CreateOkrDto) {
    return this.okrService.create(createOkrDto);
  }

  @Get('user/:userId/cycle/:cycleId')
  @ApiOperation({ summary: 'Buscar OKRs de um usuário por ciclo' })
  findForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('cycleId', ParseUUIDPipe) cycleId: string,
  ) {
    return this.okrService.findForUser(userId, cycleId);
  }

    @Patch('objective/:id')
  @ApiOperation({ summary: 'Atualizar um objetivo' })
  updateObjective(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateObjectiveDto) {
    return this.okrService.updateObjective(id, dto);
  }

  @Patch('key-result/:id')
  @ApiOperation({ summary: 'Atualizar um resultado-chave' })
  updateKeyResult(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateKeyResultDto) {
    return this.okrService.updateKeyResult(id, dto);
  }

  @Delete('objective/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar um objetivo e seus KRs' })
  removeObjective(@Param('id', ParseUUIDPipe) id: string) {
    return this.okrService.removeObjective(id);
  }
}
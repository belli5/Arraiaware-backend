import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CriteriaService } from './criteria.service';
import { AssociateCriterionDto } from './dto/associate-criterion.dto';
import { CreateCriterionDto } from './dto/create-criterion.dto';
import { UpdateCriterionDto } from './dto/update-criterion.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Criteria')
@Controller('api/criteria')
export class CriteriaController {
  constructor(private readonly criteriaService: CriteriaService) {}

  @Patch('batch-update')
  @UseInterceptors(FileInterceptor('file')) 
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Atualiza ou remove critérios em massa a partir de um arquivo XLSX' })
  @ApiResponse({ status: 200, description: 'Critérios atualizados com sucesso.' })
  @ApiBody({
    description: 'Ficheiro XLSX com as colunas "Critério Antigo" e "Critério Novo"',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  batchUpdate(@UploadedFile() file: Express.Multer.File) {
    return this.criteriaService.batchUpdateFromXlsx(file);
  }
  
  @Post()
  @ApiOperation({ summary: 'Criar um novo critério de avaliação' })
  create(@Body() createCriterionDto: CreateCriterionDto) {
    return this.criteriaService.create(createCriterionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os critérios de avaliação' })
  findAll() {
    return this.criteriaService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um critério pelo ID' })
  @ApiResponse({ status: 404, description: 'Critério não encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.criteriaService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um critério' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateCriterionDto: UpdateCriterionDto) {
    return this.criteriaService.update(id, updateCriterionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar um critério' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.criteriaService.remove(id);
  }

  @Post(':id/associate-role')
  @ApiOperation({ summary: 'Associar um critério a um cargo/trilha' })
  @ApiResponse({ status: 201, description: 'Associação criada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Critério ou Cargo não encontrado.' })
  associateRole(
    @Param('id', ParseUUIDPipe) criterionId: string,
    @Body() associateCriterionDto: AssociateCriterionDto,
  ) {
    return this.criteriaService.associateToRole(criterionId, associateCriterionDto);
  }
}
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo projeto' })
  @ApiResponse({ status: 201, description: 'Projeto criado com sucesso.' })
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os projetos' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um projeto pelo ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar um projeto' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.remove(id);
  }
}
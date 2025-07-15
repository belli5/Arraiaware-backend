import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BrutalFactsService } from './brutal-facts.service';
import { BrutalFactsDto } from './dto/brutal-facts.dto';

@ApiTags('Brutal Facts')
@Controller('api/brutal-facts')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class BrutalFactsController {
  constructor(private readonly brutalFactsService: BrutalFactsService) {}

  @Get('user/:userId/cycle/:cycleId')
  @Roles(UserType.ADMIN, UserType.RH, UserType.GESTOR, UserType.COMITE)
  @ApiOperation({ summary: 'Gera e retorna um vetor de "Brutal Facts" para um colaborador em um ciclo' })
  @ApiResponse({
    status: 200,
    description: 'Vetor de "Brutal Facts" retornado com sucesso.',
    type: [BrutalFactsDto],
  })
  @ApiResponse({ status: 404, description: 'Usuário ou ciclo não encontrado.' })
  async getBrutalFacts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('cycleId', ParseUUIDPipe) cycleId: string,
  ): Promise<BrutalFactsDto[]> {
    return this.brutalFactsService.generateBrutalFactsForMentees(userId, cycleId);
  }
}
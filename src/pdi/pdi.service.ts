import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenAIService } from '../gen-ai/gen-ai.service';
import { EvaluationsService } from '../evaluations/evaluations.service';
import { CreatePdiDto } from './dto/create-pdi.dto';
import { UpdatePdiDto } from './dto/update-pdi.dto';

@Injectable()
export class PdiService {
  constructor(
    private prisma: PrismaService,
    private genAIService: GenAIService,
    private evaluationsService: EvaluationsService,
  ) {}

  async create(dto: CreatePdiDto) {
    return this.prisma.developmentPlan.create({ data: dto });
  }

  async findForUser(userId: string, cycleId: string) {
    return this.prisma.developmentPlan.findMany({
      where: { userId, cycleId },
    });
  }

  async getAiSuggestions(userId: string, cycleId: string) {
    const history = await this.evaluationsService.findSelfEvaluation(userId, cycleId);
    if (!history || history.length === 0) {
      throw new NotFoundException('Nenhuma avaliação encontrada para gerar sugestões de PDI.');
    }
    const simplifiedHistory = history.map(h => ({
      criterion: h.criterion.criterionName,
      score: h.score,
      justification: h.justification,
    }));
    return this.genAIService.generatePdiSuggestions(simplifiedHistory);
  }

  async update(id: string, dto: UpdatePdiDto) {
    await this.prisma.developmentPlan.findUniqueOrThrow({ where: { id } });
    return this.prisma.developmentPlan.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.prisma.developmentPlan.findUniqueOrThrow({ where: { id } });
    return this.prisma.developmentPlan.delete({ where: { id } });
  }
}
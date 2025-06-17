import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitSelfEvaluationDto } from './dto/submit-self-evaluation.dto';

@Injectable()
export class EvaluationsService {
  constructor(private prisma: PrismaService) {}

  async submitSelfEvaluation(submitSelfEvaluationDto: SubmitSelfEvaluationDto) {
    const { userId, cycleId, evaluations } = submitSelfEvaluationDto;

    const operations = evaluations.map((evaluation) =>
      this.prisma.selfEvaluation.upsert({
        where: {
          userId_cycleId_criterionId: {
            userId,
            cycleId,
            criterionId: evaluation.criterionId,
          },
        },
        update: {
          score: evaluation.score,
          justification: evaluation.justification,
        },
        create: {
          userId,
          cycleId,
          criterionId: evaluation.criterionId,
          score: evaluation.score,
          justification: evaluation.justification,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }
}
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { EvaluationsService } from '../src/evaluations/evaluations.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Encryption E2E Test', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let evaluationsService: EvaluationsService;
  let createdUser;
  let createdCycle;
  let createdCriterion;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

   
    prisma = app.get<PrismaService>(PrismaService);
    evaluationsService = app.get<EvaluationsService>(EvaluationsService);

    createdUser = await prisma.user.create({ data: { name: 'Teste E2E Crypto', email: `test.crypto.${Date.now()}@example.com`, passwordHash: 'abc', userType: 'COLABORADOR' } });
    createdCycle = await prisma.evaluationCycle.create({ data: { name: `Ciclo Teste Crypto ${Date.now()}`, startDate: new Date(), endDate: new Date(), status: 'Aberto' } });
    createdCriterion = await prisma.evaluationCriterion.create({ data: { pillar: 'Teste', criterionName: `Criterio Teste Crypto ${Date.now()}` } });
  });

  afterAll(async () => {
    await prisma.selfEvaluation.deleteMany({ where: { userId: createdUser.id } });
    await prisma.user.delete({ where: { id: createdUser.id } });
    await prisma.evaluationCycle.delete({ where: { id: createdCycle.id } });
    await prisma.evaluationCriterion.delete({ where: { id: createdCriterion.id } });
    
    await app.close();
  });

  it('deve criptografar justificativas no banco de dados e descriptografar na leitura via serviço', async () => {
    const justificationText = 'Esta é uma justificativa secreta que deve ser criptografada.';

    await evaluationsService.submitSelfEvaluation({
      userId: createdUser.id,
      cycleId: createdCycle.id,
      evaluations: [{
        criterionId: createdCriterion.id,
        score: 5,
        justification: justificationText,
      }],
    });

    const rawDbRecord: { justification: string }[] = await prisma.$queryRaw`
      SELECT justification FROM SelfEvaluation WHERE userId = ${createdUser.id} AND cycleId = ${createdCycle.id}
    `;

    expect(rawDbRecord).toHaveLength(1);
    const encryptedJustification = rawDbRecord[0].justification;

    expect(encryptedJustification).toBeDefined();
    expect(encryptedJustification).not.toEqual(justificationText);
    expect(encryptedJustification).toMatch(/^[0-9a-f]+$/);

    const fetchedEvaluation = await evaluationsService.findSelfEvaluation(createdUser.id, createdCycle.id);

    expect(fetchedEvaluation).toHaveLength(1);
    expect(fetchedEvaluation[0].justification).toEqual(justificationText);
  });
});

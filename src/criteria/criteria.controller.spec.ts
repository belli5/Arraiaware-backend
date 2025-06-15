import { Test, TestingModule } from '@nestjs/testing';
import { CriteriaController } from './criteria.controller';
import { CriteriaService } from './criteria.service';

describe('CriteriaController', () => {
  let controller: CriteriaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CriteriaController],
      providers: [CriteriaService],
    }).compile();

    controller = module.get<CriteriaController>(CriteriaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

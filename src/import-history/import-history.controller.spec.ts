import { Test, TestingModule } from '@nestjs/testing';
import { ImportHistoryController } from './import-history.controller';

describe('ImportHistoryController', () => {
  let controller: ImportHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportHistoryController],
    }).compile();

    controller = module.get<ImportHistoryController>(ImportHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

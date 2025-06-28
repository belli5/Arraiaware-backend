import { Test, TestingModule } from '@nestjs/testing';
import { ImportHistoryService } from './import-history.service';

describe('ImportHistoryService', () => {
  let service: ImportHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImportHistoryService],
    }).compile();

    service = module.get<ImportHistoryService>(ImportHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

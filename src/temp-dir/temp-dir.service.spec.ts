import { Test, TestingModule } from '@nestjs/testing';
import { TempDirService } from './temp-dir.service';

describe('TempDirService', () => {
  let service: TempDirService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TempDirService],
    }).compile();

    service = module.get<TempDirService>(TempDirService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

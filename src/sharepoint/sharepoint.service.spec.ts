import { Test, TestingModule } from '@nestjs/testing';
import { SharePointService } from './sharepoint.service';

describe('SharepointService', () => {
  let service: SharePointService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharePointService],
    }).compile();

    service = module.get<SharePointService>(SharePointService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

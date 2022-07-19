import { Test, TestingModule } from '@nestjs/testing';
import { SharepointAuthService } from './sharepoint-auth.service';

describe('SharepointAuthService', () => {
  let service: SharepointAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SharepointAuthService],
    }).compile();

    service = module.get<SharepointAuthService>(SharepointAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

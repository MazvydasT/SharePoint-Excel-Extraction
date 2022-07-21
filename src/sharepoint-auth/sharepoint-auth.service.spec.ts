import { Test, TestingModule } from '@nestjs/testing';
import { SharePointAuthService } from './sharepoint-auth.service';

describe('SharepointAuthService', () => {
	let service: SharePointAuthService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [SharePointAuthService]
		}).compile();

		service = module.get<SharePointAuthService>(SharePointAuthService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});

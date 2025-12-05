import { Test, TestingModule } from '@nestjs/testing';
import { SharepointAuthController } from './sharepoint-auth.controller';

describe('SharepointAuthController', () => {
	let controller: SharepointAuthController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SharepointAuthController]
		}).compile();

		controller = module.get<SharepointAuthController>(SharepointAuthController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});

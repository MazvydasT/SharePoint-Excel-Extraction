import { Test, TestingModule } from '@nestjs/testing';
import { HttpConfigurationService } from './http-configuration.service';

describe('HttpConfigurationService', () => {
	let service: HttpConfigurationService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [HttpConfigurationService]
		}).compile();

		service = module.get<HttpConfigurationService>(HttpConfigurationService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});

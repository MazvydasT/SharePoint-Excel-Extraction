import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { HttpConfigurationService } from './http-configuration.service';

@Module({
	imports: [ConfigurationModule],
	providers: [HttpConfigurationService],
	exports: [HttpConfigurationService]
})
export class HttpConfigurationModule {}

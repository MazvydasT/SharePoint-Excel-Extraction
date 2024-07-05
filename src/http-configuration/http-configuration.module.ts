import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { ConfigurationService } from '../configuration/configuration.service';
import { HttpConfigurationService } from './http-configuration.service';

@Module({
	imports: [ConfigurationModule],
	providers: [ConfigurationService, HttpConfigurationService],
	exports: [HttpConfigurationService]
})
export class HttpConfigurationModule {}

import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { ConfigurationService } from '../configuration/configuration.service';
import { SharePointAuthService } from './sharepoint-auth.service';

@Module({
	imports: [ConfigurationModule],
	providers: [SharePointAuthService, ConfigurationService],
	exports: [SharePointAuthService]
})
export class SharePointAuthModule {}

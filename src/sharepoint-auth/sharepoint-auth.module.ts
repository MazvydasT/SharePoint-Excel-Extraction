import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigurationModule } from '../configuration/configuration.module';
import { PuppeteerModule } from '../puppeteer/puppeteer.module';
import { SHAREPOINT_AUTH_MICROSERVICE, TRANSPORT } from './sharepoint-auth.constants';
import { SharepointAuthController } from './sharepoint-auth.controller';
import { SharePointAuthService } from './sharepoint-auth.service';

@Module({
	imports: [
		ConfigurationModule,
		PuppeteerModule,
		CacheModule.register(),
		ClientsModule.register([{ name: SHAREPOINT_AUTH_MICROSERVICE, transport: TRANSPORT }])
	],
	providers: [SharePointAuthService],
	exports: [SharePointAuthService],
	controllers: [SharepointAuthController]
})
export class SharePointAuthModule {}

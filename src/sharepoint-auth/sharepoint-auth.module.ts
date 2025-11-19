import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { PuppeteerModule } from '../puppeteer/puppeteer.module';
import { SharePointAuthService } from './sharepoint-auth.service';

@Module({
	imports: [ConfigurationModule, PuppeteerModule, CacheModule.register()],
	providers: [SharePointAuthService],
	exports: [SharePointAuthService]
})
export class SharePointAuthModule {}

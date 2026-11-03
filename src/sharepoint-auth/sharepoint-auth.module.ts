import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigurationModule } from '../configuration/configuration.module.js';
import { PuppeteerModule } from '../puppeteer/puppeteer.module.js';
import {
	SHAREPOINT_AUTH_MICROSERVICE,
	TRANSPORT
} from './sharepoint-auth.constants.js';
import { SharepointAuthController } from './sharepoint-auth.controller.js';
import { SharePointAuthService } from './sharepoint-auth.service.js';

@Module({
  imports: [
    ConfigurationModule,
    PuppeteerModule,
    CacheModule.register(),
    ClientsModule.register([
      { name: SHAREPOINT_AUTH_MICROSERVICE, transport: TRANSPORT }
    ])
  ],
  providers: [SharePointAuthService],
  exports: [SharePointAuthService],
  controllers: [SharepointAuthController]
})
export class SharePointAuthModule {}

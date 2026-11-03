import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nestjs/http-client';
import { ConfigurationModule } from '../configuration/configuration.module.js';
import { HttpConfigurationModule } from '../http-configuration/http-configuration.module.js';
import { HttpConfigurationService } from '../http-configuration/http-configuration.service.js';
import { SharePointAuthModule } from '../sharepoint-auth/sharepoint-auth.module.js';
import { SharePointService } from './sharepoint.service.js';

@Module({
  imports: [
    ConfigurationModule,
    SharePointAuthModule,
    HttpClientModule.registerAsync({
      imports: [HttpConfigurationModule],
      inject: [HttpConfigurationService],
      useFactory: (config: HttpConfigurationService) =>
        config.createHttpClientModuleOptions()
    })
  ],
  providers: [SharePointService],
  exports: [SharePointService]
})
export class SharePointModule {}

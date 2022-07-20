import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { ConfigurationService } from '../configuration/configuration.service';
import { HttpConfigurationModule } from '../http-configuration/http-configuration.module';
import { HttpConfigurationService } from '../http-configuration/http-configuration.service';
import { SharePointAuthModule } from '../sharepoint-auth/sharepoint-auth.module';
import { SharePointAuthService } from '../sharepoint-auth/sharepoint-auth.service';
import { SharePointService } from './sharepoint.service';

@Module({
  imports: [
    ConfigurationModule,
    SharePointAuthModule,
    HttpModule.registerAsync({
      imports: [HttpConfigurationModule],
      useExisting: HttpConfigurationService
    })
  ],
  providers: [
    SharePointService,
    SharePointAuthService,
    ConfigurationService
  ],
  exports: [SharePointService]
})
export class SharePointModule { }
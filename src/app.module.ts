import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationModule } from './configuration/configuration.module';
import { SharePointAuthModule } from './sharepoint-auth/sharepoint-auth.module';
import { HttpConfigurationModule } from './http-configuration/http-configuration.module';
import { SharePointModule } from './sharepoint/sharepoint.module';

@Module({
  imports: [ConfigurationModule, SharePointModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
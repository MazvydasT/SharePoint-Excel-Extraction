import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationModule } from './configuration/configuration.module';
import { SharepointAuthModule } from './sharepoint-auth/sharepoint-auth.module';

@Module({
  imports: [ConfigurationModule, SharepointAuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
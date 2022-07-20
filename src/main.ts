import { NestFactory } from '@nestjs/core';
import { mergeMap } from 'rxjs';
import { AppModule } from './app.module';
import { ConfigurationService } from './configuration/configuration.service';
import { ISharePointFilesData } from './sharepoint/ISharePointFilesData';
import { Order, SharePointService } from './sharepoint/sharepoint.service';

async function bootstrap() {
  //const app = await NestFactory.create(AppModule);
  const app = await NestFactory.createApplicationContext(AppModule);
  const configurationService = app.get(ConfigurationService);
  const sharePointService = app.get(SharePointService);

  

  //await app.listen(3000);
}

bootstrap();
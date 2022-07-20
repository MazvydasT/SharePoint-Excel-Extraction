import { CacheModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationModule } from './configuration/configuration.module';
import { ExcelModule } from './excel/excel.module';
import { SharePointModule } from './sharepoint/sharepoint.module';

@Module({
  imports: [
    ConfigurationModule,
    SharePointModule,
    ExcelModule,

    CacheModule.register({
      ttl: 0
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
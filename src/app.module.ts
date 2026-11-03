import { Module } from '@nestjs/common';
import { ConfigurationModule } from './configuration/configuration.module.js';
import { ExcelModule } from './excel/excel.module.js';
import { FileSystemModule } from './file-system/file-system.module.js';
import { OutputModule } from './output/output.module.js';
import { SharePointModule } from './sharepoint/sharepoint.module.js';

@Module({
  imports: [
    ConfigurationModule,
    FileSystemModule,
    SharePointModule,
    ExcelModule,
    OutputModule,
    FileSystemModule
  ]
})
export class AppModule {}

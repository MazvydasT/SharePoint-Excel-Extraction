import { Module } from '@nestjs/common';
import { ConfigurationModule } from './configuration/configuration.module';
import { ExcelModule } from './excel/excel.module';
import { FileSystemModule } from './file-system/file-system.module';
import { OutputModule } from './output/output.module';
import { SharePointModule } from './sharepoint/sharepoint.module';

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

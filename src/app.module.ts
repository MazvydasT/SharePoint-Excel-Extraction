import { CacheModule, Module } from '@nestjs/common';
import { ConfigurationModule } from './configuration/configuration.module';
import { ExcelModule } from './excel/excel.module';
import { OutputModule } from './output/output.module';
import { SharePointModule } from './sharepoint/sharepoint.module';

@Module({
	imports: [
		ConfigurationModule,
		SharePointModule,
		ExcelModule,
		OutputModule,

		CacheModule.register({
			ttl: 0
		})
	]
})
export class AppModule {}

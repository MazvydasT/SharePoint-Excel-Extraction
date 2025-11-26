import { Module } from '@nestjs/common';
import { TempDirModule } from '../temp-dir/temp-dir.module';
import { PuppeteerService } from './puppeteer.service';

@Module({
	imports: [TempDirModule],
	providers: [PuppeteerService],
	exports: [PuppeteerService]
})
export class PuppeteerModule {}

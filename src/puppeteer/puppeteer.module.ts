import { Module } from '@nestjs/common';
import { TempDirModule } from '../temp-dir/temp-dir.module.js';
import { PuppeteerService } from './puppeteer.service.js';

@Module({
  imports: [TempDirModule],
  providers: [PuppeteerService],
  exports: [PuppeteerService]
})
export class PuppeteerModule {}

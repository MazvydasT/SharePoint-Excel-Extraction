import { Module } from '@nestjs/common';
import { TempDirService } from './temp-dir.service.js';

@Module({
  providers: [TempDirService],
  exports: [TempDirService]
})
export class TempDirModule {}

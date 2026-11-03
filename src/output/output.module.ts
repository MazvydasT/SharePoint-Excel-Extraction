import { Module } from '@nestjs/common';
import { BigQueryModule } from '../big-query/big-query.module.js';
import { OutputService } from './output.service.js';

@Module({
  imports: [BigQueryModule],
  providers: [OutputService],
  exports: [OutputService]
})
export class OutputModule {}

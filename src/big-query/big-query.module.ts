import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module.js';
import { BigQueryService } from './big-query.service.js';

@Module({
  imports: [ConfigurationModule],
  providers: [BigQueryService],
  exports: [BigQueryService]
})
export class BigQueryModule {}

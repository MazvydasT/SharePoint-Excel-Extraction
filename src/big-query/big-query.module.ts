import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module';
import { ConfigurationService } from '../configuration/configuration.service';
import { BigQueryService } from './big-query.service';

@Module({
  imports: [ConfigurationModule],
  providers: [BigQueryService, ConfigurationService],
  exports: [BigQueryService]
})
export class BigQueryModule { }
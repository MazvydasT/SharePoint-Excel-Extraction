import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration/configuration.module.js';
import { HttpConfigurationService } from './http-configuration.service.js';

@Module({
  imports: [ConfigurationModule],
  providers: [HttpConfigurationService],
  exports: [HttpConfigurationService]
})
export class HttpConfigurationModule {}

import { Injectable } from '@nestjs/common';
import {
	HttpClientModuleFactoryOptions,
	HttpClientModuleOptionsFactory
} from '@nestjs/http-client';
import { ProxyAgent } from 'undici';
import { ConfigurationService } from '../configuration/configuration.service.js';

@Injectable()
export class HttpConfigurationService implements HttpClientModuleOptionsFactory {
  constructor(private configurationService: ConfigurationService) {}

  createHttpClientModuleOptions():
    HttpClientModuleFactoryOptions | Promise<HttpClientModuleFactoryOptions> {
    return {
      timeout: 10000,
      dispatcher: !!this.configurationService.httpsProxy
        ? new ProxyAgent(this.configurationService.httpsProxy)
        : undefined
    };
  }
}

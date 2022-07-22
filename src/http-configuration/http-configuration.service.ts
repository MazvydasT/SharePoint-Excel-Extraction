import { HttpModuleOptions, HttpModuleOptionsFactory, Injectable } from '@nestjs/common';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ConfigurationService } from '../configuration/configuration.service';

@Injectable()
export class HttpConfigurationService implements HttpModuleOptionsFactory {
	constructor(private configurationService: ConfigurationService) {}

	createHttpOptions(): HttpModuleOptions | Promise<HttpModuleOptions> {
		return {
			proxy: false,
			timeout: 10000,
			...(!!this.configurationService.httpsProxy
				? {
						httpsAgent: new HttpsProxyAgent(this.configurationService.httpsProxy)
				  }
				: {})
		};
	}
}

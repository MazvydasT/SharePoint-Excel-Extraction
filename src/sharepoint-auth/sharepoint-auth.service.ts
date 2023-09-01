import { Injectable } from '@nestjs/common';
import { IAuthResponse, getAuth } from 'node-sp-auth';
import { defer } from 'rxjs';
import { ConfigurationService } from '../configuration/configuration.service';

@Injectable()
export class SharePointAuthService {
	constructor(private configurationService: ConfigurationService) {}

	getAuth(url: URL, username: string, password: string) {
		return defer(async () =>
			!!this.configurationService.ntlm
				? Promise.resolve({} as IAuthResponse)
				: getAuth(url.origin, {
						username,
						password
				  })
		);
	}
}

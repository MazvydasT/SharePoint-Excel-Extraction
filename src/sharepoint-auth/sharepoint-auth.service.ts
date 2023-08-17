import { Injectable } from '@nestjs/common';
import { IAuthResponse } from 'node-sp-auth';
import { defer } from 'rxjs';
import { ConfigurationService } from '../configuration/configuration.service';

@Injectable()
export class SharePointAuthService {
	constructor(private configurationService: ConfigurationService) {}

	getAuth(url: URL, username: string, password: string) {
		return defer(async () => {
			if (!!this.configurationService.ntlm) {
				return Promise.resolve({} as IAuthResponse);
			} else {
				// getAuth from node-sp-auth must not be imported when using NTLM
				// as importing getAuth causes Axios NTLM requests to fail due to some HTTPS proxy issue
				const { getAuth } = await import(`node-sp-auth`);

				return await getAuth(url.origin, {
					username,
					password
				});
			}
		});
	}
}

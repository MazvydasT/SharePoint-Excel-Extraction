import { Injectable } from '@nestjs/common';
import { getAuth } from 'node-sp-auth';
import { defer } from 'rxjs';

@Injectable()
export class SharePointAuthService {
	getAuth(url: URL, username: string, password: string) {
		return defer(() => {
			return getAuth(url.origin, {
				username,
				password
			});
		});
	}
}

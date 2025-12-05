import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GET_AUTH_COMMAND } from './sharepoint-auth.constants';
import { SharePointAuthService } from './sharepoint-auth.service';

@Controller()
export class SharepointAuthController {
	constructor(private sharepointAuthService: SharePointAuthService) {}

	@MessagePattern(GET_AUTH_COMMAND)
	getAuth(data: { url: string; username: string; password: string }) {
		const { url, username, password } = data;
		return this.sharepointAuthService.getAuth(url, username, password);
	}
}

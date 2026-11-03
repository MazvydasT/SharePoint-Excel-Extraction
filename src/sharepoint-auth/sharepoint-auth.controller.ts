import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GET_AUTH_COMMAND } from './sharepoint-auth.constants.js';
import { SharePointAuthService } from './sharepoint-auth.service.js';

@Controller()
export class SharepointAuthController {
  constructor(private sharepointAuthService: SharePointAuthService) {}

  @MessagePattern(GET_AUTH_COMMAND)
  getAuth(data: { url: string; username: string; password: string }) {
    const { url, username, password } = data;
    return this.sharepointAuthService.getAuth(url, username, password);
  }
}

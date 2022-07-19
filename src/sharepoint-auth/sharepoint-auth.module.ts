import { Module } from '@nestjs/common';
import { SharepointAuthService } from './sharepoint-auth.service';

@Module({
  providers: [SharepointAuthService],
  exports: [SharepointAuthService]
})
export class SharepointAuthModule { }
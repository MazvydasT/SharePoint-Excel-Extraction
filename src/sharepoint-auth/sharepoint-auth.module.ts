import { Module } from '@nestjs/common';
import { SharePointAuthService } from './sharepoint-auth.service';

@Module({
	providers: [SharePointAuthService],
	exports: [SharePointAuthService]
})
export class SharePointAuthModule {}

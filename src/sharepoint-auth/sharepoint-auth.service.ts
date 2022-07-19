import { Injectable } from '@nestjs/common';
import { getAuth } from 'node-sp-auth';
import { from } from 'rxjs';

@Injectable()
export class SharepointAuthService {
    getAuth(url: string, username: string, password: string) {
        return from(getAuth(url, {
            username,
            password
        }));
    }
}
import { Injectable } from '@nestjs/common';
import { getAuth } from 'node-sp-auth';
import { from } from 'rxjs';

@Injectable()
export class SharePointAuthService {
    getAuth(url: URL, username: string, password: string) {
        return from(getAuth(url.origin, {
            username,
            password
        }));
    }
}
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DisposableTempDir, mkdtempDisposableSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Observable } from 'rxjs';

const TEMP_DIR_PATH = join(tmpdir(), randomUUID());

@Injectable()
export class TempDirService {
	getTempDir() {
		return new Observable<DisposableTempDir>(subscriber => {
			try {
				const tempDirObject = mkdtempDisposableSync(TEMP_DIR_PATH);
				subscriber.next(tempDirObject);
				subscriber.complete();
			} catch (error) {
				subscriber.error(error);
			}
		});
	}
}

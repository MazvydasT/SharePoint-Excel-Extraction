import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdtempDisposable } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const TEMP_DIR_PATH = tmpdir();

@Injectable()
export class TempDirService {
	getTempDir() {
		return mkdtempDisposable(join(TEMP_DIR_PATH, randomUUID()));
	}
}

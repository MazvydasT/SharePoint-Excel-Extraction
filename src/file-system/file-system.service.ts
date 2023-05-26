import { Injectable } from '@nestjs/common';
import { readFile, stat } from 'fs/promises';
import { from } from 'rxjs';

@Injectable()
export class FileSystemService {
	getFileInfo(filePath: string) {
		return from(stat(filePath));
	}

	getFileContent(filePath: string) {
		return from(
			readFile(filePath, {
				flag: `r`
			})
		);
	}
}

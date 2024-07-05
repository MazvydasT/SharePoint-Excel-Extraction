import { Injectable } from '@nestjs/common';
import { glob } from 'fast-glob';
import { readFile } from 'fs/promises';
import { first, from as ixFrom } from 'ix/Ix.iterable';
import { orderByDescending } from 'ix/Ix.iterable.operators';
import { from, map } from 'rxjs';

@Injectable()
export class FileSystemService {
	getFileInfo(filePath: string) {
		return from(
			glob(filePath, {
				stats: true
			})
		).pipe(map(paths => first(ixFrom(paths).pipe(orderByDescending(path => path.stats?.mtimeMs)))));
	}

	getFileContent(filePath: string) {
		return from(
			readFile(filePath, {
				flag: `r`
			})
		);
	}
}

import { Injectable } from '@nestjs/common';
import { glob } from 'fast-glob';
import { readFile } from 'fs/promises';
import { from as ixFrom } from 'ix/iterable';
import { map as ixMap, orderByDescending, take } from 'ix/iterable/operators';
import { defer, from, map, mergeMap } from 'rxjs';

@Injectable()
export class FileSystemService {
	getFileInfo(filePath: string, getMostRecentlyEditedFileOnly: boolean) {
		return from(
			glob(filePath, {
				stats: true
			})
		).pipe(
			map(entries => {
				const count = entries.length;

				return ixFrom(
					getMostRecentlyEditedFileOnly
						? ixFrom(entries).pipe(
								orderByDescending(entries => entries.stats?.mtimeMs),
								take(1)
							)
						: entries
				).pipe(
					ixMap((entry, index) => ({
						entry,
						index,
						count
					}))
				);
			}),
			mergeMap(entries => from(entries))
		);
	}

	getFileContent(filePath: string) {
		return defer(() =>
			readFile(filePath, {
				flag: `r`
			})
		);
	}
}

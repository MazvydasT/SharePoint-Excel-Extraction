import { Injectable } from '@nestjs/common';
import { glob, readFile, stat } from 'fs/promises';
import { from as ixFromAsync, toArray } from 'ix/asynciterable';
import {
  map as ixMapAsync,
  orderBy,
  orderByDescending,
  take
} from 'ix/asynciterable/operators';
import { from as ixFrom } from 'ix/iterable';
import { parse, resolve } from 'path';

import { map as ixMapSync } from 'ix/iterable/operators';
import { defer, mergeMap, from as rxFrom, map as rxMap } from 'rxjs';

@Injectable()
export class FileSystemService {
  getFileInfo(filePath: string, getMostRecentlyEditedFileOnly: boolean) {
    const { dir, base } = parse(filePath);

    let paths = ixFromAsync(glob(base, { cwd: dir, withFileTypes: true })).pipe(
      ixMapAsync(async (entry) => {
        const path = resolve(entry.parentPath, entry.name);

        return { stats: await stat(path), path };
      })
    );

    if (getMostRecentlyEditedFileOnly) {
      paths = paths.pipe(
        orderByDescending((entry) => entry.stats.mtimeMs),
        take(1)
      );
    } else {
      paths = paths.pipe(orderBy((entry) => entry.stats.mtimeMs));
    }

    return rxFrom(toArray(paths)).pipe(
      rxMap((entries) => {
        const count = entries.length;

        return ixFrom(entries).pipe(
          ixMapSync((entry, index) => ({
            entry,
            index,
            count
          }))
        );
      }),
      mergeMap((entries) => rxFrom(entries))
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

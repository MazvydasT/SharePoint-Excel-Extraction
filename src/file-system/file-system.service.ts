import { Injectable } from '@nestjs/common';
import { glob, readFile, stat } from 'fs/promises';
import { from as ixFromAsync, toArray } from 'ix/asynciterable';
import {
  map as ixMapAsync,
  orderByDescending,
  take,
  tap
} from 'ix/asynciterable/operators';
import { from as ixFrom } from 'ix/iterable';

import { map as ixMapSync } from 'ix/iterable/operators';
import { defer, mergeMap, from as rxFrom, map as rxMap } from 'rxjs';

@Injectable()
export class FileSystemService {
  getFileInfo(filePath: string, getMostRecentlyEditedFileOnly: boolean) {
    return rxFrom(
      toArray(
        ixFromAsync(glob(filePath)).pipe(
          ixMapAsync(async (path) => ({ stats: await stat(path), path })),
          getMostRecentlyEditedFileOnly
            ? orderByDescending((entry) => entry.stats.mtimeMs)
            : tap(),
          getMostRecentlyEditedFileOnly ? take(1) : tap()
        )
      )
    ).pipe(
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

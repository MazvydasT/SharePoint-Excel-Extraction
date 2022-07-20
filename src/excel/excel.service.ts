import { Injectable } from '@nestjs/common';
import { ParsingOptions, read, Sheet2JSONOpts, utils } from 'xlsx';
import { of } from 'rxjs';

@Injectable()
export class ExcelService {
    getSheetData<T>(excelFile: Buffer, sheetName: string, parsingOptions?: ParsingOptions, sheet2JSONOptions?: Sheet2JSONOpts) {
        return of(
            utils.sheet_to_json<T>(
                read(excelFile, {
                    ...parsingOptions,
                    sheets: [sheetName]
                }).Sheets[sheetName],
                sheet2JSONOptions
            )
        );
    }
}
import { Injectable } from '@nestjs/common';
import { ParsingOptions, read, Sheet2JSONOpts, utils, WorkSheet } from 'xlsx';

@Injectable()
export class ExcelService {
	getSheet(excelFile: Buffer, sheetName: string, parsingOptions?: ParsingOptions) {
		const workbook = read(excelFile, {
			...parsingOptions,
			sheets: [sheetName]
		});

		return workbook.Sheets[sheetName];
	}

	getSheetData<T>(worksheet: WorkSheet, sheet2JSONOptions?: Sheet2JSONOpts) {
		return utils.sheet_to_json<T>(worksheet, sheet2JSONOptions);
	}
}

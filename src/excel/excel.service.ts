import { Injectable } from '@nestjs/common';
import { of } from 'rxjs';
import { ParsingOptions, read, Sheet2JSONOpts, utils } from 'xlsx';

@Injectable()
export class ExcelService {
	getSheetData<T>(
		excelFile: Buffer,
		sheetName: string,
		parsingOptions?: ParsingOptions,
		sheet2JSONOptions?: Sheet2JSONOpts
	) {
		const workbook = read(excelFile, {
			...parsingOptions,
			sheets: [sheetName]
		});

		const worksheet = workbook.Sheets[sheetName];

		const data = utils.sheet_to_json<T>(worksheet, sheet2JSONOptions);

		return of(data);
	}
}

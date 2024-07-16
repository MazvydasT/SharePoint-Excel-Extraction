import { Injectable } from '@nestjs/common';
import { ParsingOptions, read, Sheet2JSONOpts, utils, WorkSheet } from 'xlsx';

const ADDRESS_REG_EXP = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/;

@Injectable()
export class ExcelService {
	getSheet(excelFile: Buffer, sheetNameOrIndex: string | number, parsingOptions?: ParsingOptions) {
		const workbook = read(excelFile, {
			...parsingOptions,
			dense: true,
			sheets: [sheetNameOrIndex]
		});

		return workbook.Sheets[
			typeof sheetNameOrIndex == 'number' ? workbook.SheetNames[sheetNameOrIndex] : sheetNameOrIndex
		];
	}

	getSheetData<T>(worksheet: WorkSheet, sheet2JSONOptions?: Sheet2JSONOpts) {
		const data = utils.sheet_to_json<T>(worksheet, sheet2JSONOptions);

		return data;
	}

	// https://stackoverflow.com/a/63289127/2358659
	columnNumberToName(columnNumber: number): string {
		let columnName = '';

		while (columnNumber > 0) {
			const newColumnNumber = Math.floor((columnNumber - 1) / 26);
			const remainder = (columnNumber - 1) % 26;

			columnNumber = newColumnNumber;
			columnName = String.fromCharCode(65 + remainder) + columnName;
		}

		return columnName;
	}

	// https://stackoverflow.com/a/63289127/2358659
	columnNameToNumber(columnName: string) {
		let columnNumber = 0;

		for (let i = 0; i < columnName.length; ++i)
			columnNumber = columnName[i].charCodeAt(0) - 64 + columnNumber * 26;

		return columnNumber;
	}

	getUsedRange(worksheet: WorkSheet) {
		const refPropertyName = '!ref';

		const ref = worksheet[refPropertyName];

		if (!ref)
			throw new ReferenceError(`'worksheet' object does not have a '${refPropertyName}' property`);

		if (!ADDRESS_REG_EXP.test(ref))
			throw new SyntaxError(
				`${refPropertyName} property has value of '${ref}' which is not expected`
			);

		const [, minColumnName, minRowStr, maxColumnName, maxRowStr] = ADDRESS_REG_EXP.exec(ref)!;

		return {
			minRow: parseInt(minRowStr),
			minColumn: this.columnNameToNumber(minColumnName),
			maxRow: parseInt(maxRowStr),
			maxColumn: this.columnNameToNumber(maxColumnName),
			minColumnName,
			maxColumnName
		};
	}
}

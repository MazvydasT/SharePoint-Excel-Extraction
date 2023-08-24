import { Injectable } from '@nestjs/common';
import { ParsingOptions, read, Sheet2JSONOpts, utils, WorkSheet } from 'xlsx';

@Injectable()
export class ExcelService {
	getSheet(excelFile: Buffer, sheetNameOrIndex: string | number, parsingOptions?: ParsingOptions) {
		const workbook = read(excelFile, {
			...parsingOptions,
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
		let minRow = Number.MAX_SAFE_INTEGER;
		let minColumn = Number.MAX_SAFE_INTEGER;
		let minColumnName = ``;

		let maxRow = 0;
		let maxColumn = 0;
		let maxColumnName = ``;

		const cellAddressRegExp = /^([A-Z]+)(\d+)$/;

		for (const [key] of Object.entries(worksheet)) {
			const [, columnName, row] = cellAddressRegExp.exec(key) ?? [undefined, undefined, undefined];

			if (!columnName || !row) continue;

			const columnNumber = this.columnNameToNumber(columnName);
			const rowNumber = parseInt(row);

			if (rowNumber < minRow) minRow = rowNumber;
			if (columnNumber < minColumn) {
				minColumn = columnNumber;
				minColumnName = columnName;
			}

			if (rowNumber > maxRow) maxRow = rowNumber;
			if (columnNumber > maxColumn) {
				maxColumn = columnNumber;
				maxColumnName = columnName;
			}
		}

		return maxRow == 0
			? null
			: {
					minRow,
					minColumn,
					maxRow,
					maxColumn,
					minColumnName,
					maxColumnName
			  };
	}
}

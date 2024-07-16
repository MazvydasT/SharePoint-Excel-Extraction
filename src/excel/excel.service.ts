import { Injectable } from '@nestjs/common';
import { ParsingOptions, read, Sheet2JSONOpts, utils, WorkSheet } from 'xlsx';

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
		const data = worksheet['!data'];

		if (!data) return null;

		const rowIndices = Object.keys(data);
		const minRow = parseInt(rowIndices[0]) + 1;
		const maxRow = parseInt(rowIndices[rowIndices.length - 1]) + 1;

		let minColumn = Number.MAX_SAFE_INTEGER;
		let maxColumn = 0;

		for (const rowData of data) {
			if (!rowData) continue;

			const columnIndices = Object.keys(rowData);
			minColumn = Math.min(minColumn, parseInt(columnIndices[0]) + 1);
			maxColumn = Math.max(maxColumn, parseInt(columnIndices[columnIndices.length - 1]) + 1);
		}

		if (maxColumn == 0) return null;

		return {
			minRow,
			minColumn,
			maxRow,
			maxColumn,
			minColumnName: this.columnNumberToName(minColumn),
			maxColumnName: this.columnNumberToName(maxColumn)
		};
	}
}

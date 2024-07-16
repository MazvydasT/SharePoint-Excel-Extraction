// Must be set to false in order for global-agent (used by node-sp-auth) package
// not to override custom configured HTTP(S) Agents,
// as override causes failure when using NtlmClient
process.env.GLOBAL_AGENT_FORCE_GLOBAL_AGENT = `false`;

import { TableSchema } from '@google-cloud/bigquery';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { from, last, range, toArray } from 'ix/iterable';
import { flatMap, groupBy, map as mapIx, orderBy } from 'ix/iterable/operators';
import moment from 'moment';
import { parse } from 'path';
import {
	EMPTY,
	RetryConfig,
	catchError,
	concatAll,
	firstValueFrom,
	lastValueFrom,
	map,
	mergeMap,
	of,
	retry,
	tap,
	throwError,
	timer
} from 'rxjs';
import { AppModule } from './app.module';
import { ConfigurationService } from './configuration/configuration.service';
import { ExcelService } from './excel/excel.service';
import { FileSystemService } from './file-system/file-system.service';
import { OutputService } from './output/output.service';
import { SharePointService } from './sharepoint/sharepoint.service';
import { getAdditionalProperties } from './utils';

enum FileType {
	SharePoint,
	FileSystem
}

async function bootstrap() {
	const app = await NestFactory.createApplicationContext(AppModule);

	const configurationService = app.get(ConfigurationService);
	const sharePointService = app.get(SharePointService);
	const fileSystemService = app.get(FileSystemService);
	const excelService = app.get(ExcelService);
	const outputService = app.get(OutputService);
	const cache = app.get<Cache>(CACHE_MANAGER);

	const logger = new Logger(`main`);

	const nonAlphaNumericRegExp = /[^A-Z0-9]/gi;
	const nonAlphaNumericStartRegExp = /^[^A-Z0-9]+/gi;
	const nonAlphaNumericStartOnlyBeforeLettersRegExp = /^[^A-Z0-9]+(?=[A-Z])/gi;
	const nonAlphaNumericEndRegExp = /[^A-Z0-9]+$/gi;
	const numericStartRegExp = /^\d.*$/;

	const retryConfig: RetryConfig = {
		count: configurationService.retries,
		delay: configurationService.retryDelay,
		resetOnSuccess: true
	};

	const fileName = configurationService.filename;
	const fileNameWithoutStars = fileName?.replace(/(?:\*+)|(?:\*+$)/g, ``);
	const startsWithStar = fileName?.startsWith('*') ?? false;
	const endsWithStar = fileName?.endsWith('*') ?? false;

	const substringFunctionName = `substringof`;
	const startsWithFunctionName = `startswith`;

	const nameColumn = `Name`;

	const nameFilter = !fileName
		? undefined
		: startsWithStar
			? `${substringFunctionName}('${fileNameWithoutStars}',${nameColumn})`
			: !startsWithStar && !endsWithStar
				? `${nameColumn} eq '${fileNameWithoutStars}'`
				: `${startsWithFunctionName}(${nameColumn},'${fileNameWithoutStars}')`;

	const bigQueryDateTimeFormat = `YYYY-MM-DD HH:mm:ss`;

	while (true) {
		logger.log(`Starting extraction`);

		const extractionTime = moment().utc().format(bigQueryDateTimeFormat);

		const getMostRecentlyEditedFileOnly = !configurationService.multipleFiles;

		try {
			await lastValueFrom(
				(!!configurationService.filePath
					? fileSystemService
							.getFileInfo(configurationService.filePath, getMostRecentlyEditedFileOnly)
							.pipe(
								map(({ entry, index, count }) => ({
									etag: entry?.stats?.mtime?.toISOString(),
									uri: entry?.path,
									type: FileType.FileSystem,
									index,
									count
								}))
							)
					: (!!configurationService.sharePointFolder
							? sharePointService.getFilesDataFromFolder(
									configurationService.sharePointFolder,
									getMostRecentlyEditedFileOnly,
									nameFilter
								)
							: !!configurationService.fileURL
								? sharePointService.getFileByURL(configurationService.fileURL)
								: EMPTY
						).pipe(
							map(({ fileData, index, count }) => {
								return {
									etag: fileData?.ETag ?? fileData?.__metadata?.etag,
									uri: fileData?.__metadata?.id ?? fileData?.__metadata?.media_src,
									type: FileType.SharePoint,
									index,
									count
								};
							})
						)
				).pipe(
					retry(retryConfig),
					mergeMap(async fileData => {
						const fileDataCountAsString = `${fileData.count}`;
						const fileDataNumberAsString = `${fileData.index + 1}`.padStart(
							fileDataCountAsString.length,
							` `
						);

						const sequenceIdentifier = `${fileDataNumberAsString}/${fileDataCountAsString}`;

						if (!fileData.uri) {
							logger.warn(`${sequenceIdentifier} No file(s) found`);

							return EMPTY;
						}

						const decodedURI =
							fileData.type == FileType.SharePoint ? decodeURI(fileData.uri) : fileData.uri;

						let currentlyExtractedFileName = last(decodedURI.split(/(?:\\|\/)/))!;
						if (currentlyExtractedFileName.endsWith(`')`))
							currentlyExtractedFileName = currentlyExtractedFileName.slice(
								0,
								currentlyExtractedFileName.length - 2
							);

						const cachedETag = (await cache.get<string>(fileData.uri)) ?? null;

						if (cachedETag == fileData.etag) {
							logger.log(`${sequenceIdentifier} No changes in ${currentlyExtractedFileName}`);

							return EMPTY;
						}

						const sheetNumberOrName =
							typeof configurationService.sheet == `number`
								? `index ${configurationService.sheet}`
								: `'${configurationService.sheet}'`;

						return (
							fileData.type == FileType.SharePoint
								? sharePointService.getFileContent(
										new URL(`${fileData.uri}${!!configurationService.sps2010 ? '' : '//$value'}`)
									)
								: fileSystemService.getFileContent(fileData.uri)
						).pipe(
							mergeMap(excelFile => {
								const worksheet = excelService.getSheet(excelFile, configurationService.sheet, {
									cellFormula: false,
									cellHTML: false,
									cellDates: true,
									cellText: false,
									raw: true
								});

								const headerRow = configurationService.headerRow;

								const usedRange = excelService.getUsedRange(worksheet);

								if (!usedRange) return EMPTY;

								const maxColumn = usedRange.maxColumn;

								const header =
									headerRow == 0
										? toArray(
												range(usedRange.minColumn, maxColumn).pipe(
													mapIx(excelService.columnNumberToName)
												)
											)
										: toArray(
												from(
													Array.from({
														...excelService
															.getSheetData<string | null>(worksheet, {
																header: 1,
																range: `${usedRange.minColumnName}${headerRow}:${usedRange.maxColumnName}${headerRow}`,
																defval: null
															})
															.flat(1),

														length: maxColumn
													})
												).pipe(
													mapIx((columnName, index) => {
														let trimmedColumnName = `${columnName ?? ``}`.trim();

														if (trimmedColumnName.replace(nonAlphaNumericRegExp, ``).length == 0)
															trimmedColumnName = ``;

														if (numericStartRegExp.test(trimmedColumnName))
															trimmedColumnName = `_` + trimmedColumnName;

														return {
															name:
																trimmedColumnName.length > 0
																	? trimmedColumnName
																	: `BLANK (${excelService.columnNumberToName(index + 1)})`,
															index
														};
													}),
													groupBy(columnInfo => columnInfo.name.toUpperCase()),
													flatMap(columnInfoGroup =>
														columnInfoGroup.pipe(
															mapIx(({ name, index }, inGroupIndex) => ({
																name: name + (inGroupIndex > 0 ? `_${inGroupIndex}` : ``),
																index
															}))
														)
													),
													orderBy(({ index }) => index),
													mapIx(({ name }) => name)
												)
											);

								const dataRowNumber = configurationService.dataRow;

								const dataRows = excelService.getSheetData<Record<string, any>>(worksheet, {
									header,
									range: `${usedRange.minColumnName}${
										!!dataRowNumber ? dataRowNumber : headerRow + 1
									}:${usedRange.maxColumnName}${usedRange.maxRow}`,
									...(configurationService.includeBlankColumns ? { defval: null } : {})
								});

								return of(dataRows);
							}),
							retry(retryConfig),
							catchError(err => {
								if (configurationService.multipleFiles) {
									logger.warn(
										`${sequenceIdentifier} Extraction failed for sheet ${sheetNumberOrName} in file\n${fileData.uri}\n\nwith following error:\n${err}`
									);

									return EMPTY;
								} else return throwError(() => err);
							}),
							tap(() => {
								logger.log(
									`${sequenceIdentifier} Data extracted from sheet ${sheetNumberOrName} in '${currentlyExtractedFileName}'`
								);
							}),

							map(dataRows => {
								const extractionTimeFieldName = `ExtractionTime`;

								const stringType = `STRING`;
								const integerType = `INTEGER`;
								const floatType = `FLOAT`;
								const timestampType = `TIMESTAMP`;

								const fieldTypes = new Map<
									string,
									Record<
										| typeof timestampType
										| typeof stringType
										| typeof integerType
										| typeof floatType,
										boolean
									>
								>([
									[
										extractionTimeFieldName,
										{ TIMESTAMP: true, STRING: false, INTEGER: false, FLOAT: false }
									]
								]);

								let dataRowsIterable = from(dataRows).pipe(
									mapIx(dataRow =>
										Object.fromEntries(
											Object.entries(dataRow).map(([key, value]) => {
												const newKey = key
													.replaceAll(nonAlphaNumericRegExp, `_`)
													.replaceAll(nonAlphaNumericStartRegExp, `_`)
													.replaceAll(nonAlphaNumericStartOnlyBeforeLettersRegExp, ``)
													.replaceAll(nonAlphaNumericEndRegExp, ``);

												let fieldType = fieldTypes.get(newKey);

												if (!fieldType) {
													fieldType = {
														TIMESTAMP: false,
														STRING: false,
														INTEGER: false,
														FLOAT: false
													};
													fieldTypes.set(newKey, fieldType);
												}

												let newValue = value;

												if (value instanceof Date) {
													newValue = moment(value)
														.add(1, `millisecond`) // Fixes time being displayed 1s less than what is in source Excel file
														.format(bigQueryDateTimeFormat);

													fieldType.TIMESTAMP = true;
												} else if (typeof newValue == 'string') {
													if (newValue.trim().length == 0) newValue = null;

													if (!!newValue) fieldType.STRING = true;
												} else if (typeof newValue == `number`) {
													const isInteger = Number.isInteger(newValue);

													if (!isInteger) fieldType.FLOAT = true;
													if (isInteger) fieldType.INTEGER = true;
												}

												return [newKey, newValue];
											})
										)
									),
									mapIx(dataRow => ({ ...dataRow, [extractionTimeFieldName]: extractionTime }))
								);

								dataRowsIterable = from(toArray(dataRowsIterable));

								const schema: TableSchema = {
									fields: toArray(
										from(fieldTypes.entries()).pipe(
											mapIx(([name, type]) => ({
												mode: `NULLABLE`,
												name,
												type: type.STRING
													? stringType
													: type.TIMESTAMP && (type.FLOAT || type.INTEGER)
														? stringType
														: type.TIMESTAMP
															? timestampType
															: type.FLOAT
																? floatType
																: type.INTEGER
																	? integerType
																	: stringType
											}))
										)
									)
								};

								return {
									dataRows: dataRowsIterable,
									schema
								};
							}),

							mergeMap(({ dataRows, schema }) => {
								logger.log(
									`${sequenceIdentifier} Writing sheet ${sheetNumberOrName} in '${currentlyExtractedFileName}' data to BigQuery`
								);

								const bigQueryTableName = !!configurationService.bigQueryTable
									? configurationService.bigQueryTable
									: parse(currentlyExtractedFileName).name.replaceAll(nonAlphaNumericRegExp, `_`);

								return outputService.outputToBigQuery(dataRows, bigQueryTableName, schema).pipe(
									retry(retryConfig),
									tap(() => {
										logger.log(
											`${sequenceIdentifier} Sheet ${sheetNumberOrName} in '${currentlyExtractedFileName}' data written to BigQuery`
										);

										cache.set(fileData.uri, fileData.etag);
									})
								);
							})
						);
					}),
					concatAll()
				),
				{ defaultValue: null }
			);
		} catch (error) {
			logger.error(error, ...getAdditionalProperties(error), error.stack);

			// Persistent error cooldown
			logger.log(
				`Persistent error occured. Will retry in ${moment
					.duration(configurationService.persistentErrorCooldown)
					.humanize()}.`
			);

			await firstValueFrom(timer(configurationService.persistentErrorCooldown));

			continue;
		}

		const cron = configurationService.cron;

		if (!cron) break;

		const now = moment();

		cron.reset(now.toDate());

		const nextExtractionStart = moment(cron.next().value.toDate());
		const msToStartAnotherExtraction = Math.max(nextExtractionStart.diff(now), 0);

		logger.log(
			`Next extraction will start in ${moment
				.duration(msToStartAnotherExtraction)
				.humanize()} ${nextExtractionStart.calendar({
				sameDay: `[today at] HH:mm`,
				nextDay: `[tomorrow at] HH:mm`,
				nextWeek: `[on] dddd [at] HH:mm`
			})}`
		);

		await firstValueFrom(timer(msToStartAnotherExtraction));
	}

	//await app.listen(3000);
}

bootstrap();

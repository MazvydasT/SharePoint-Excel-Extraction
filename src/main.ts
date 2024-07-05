// Must be set to false in order for global-agent (used by node-sp-auth) package
// not to override custom configured HTTP(S) Agents,
// as override causes failure when using NtlmClient
process.env.GLOBAL_AGENT_FORCE_GLOBAL_AGENT = `false`;

import { TableSchema } from '@google-cloud/bigquery';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { from, range, toArray } from 'ix/Ix.iterable';
import { flatMap, groupBy, map as mapIx, orderBy } from 'ix/Ix.iterable.operators';
import moment from 'moment';
import {
	EMPTY,
	RetryConfig,
	firstValueFrom,
	map,
	mergeMap,
	of,
	retry,
	switchAll,
	tap,
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
	const nonAlphaNumericStarOnlyBeforeLettersRegExp = /^[^A-Z0-9]+(?=[A-Z])/gi;
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

		try {
			await firstValueFrom(
				(!!configurationService.filePath
					? fileSystemService.getFileInfo(configurationService.filePath).pipe(
							map(data => ({
								etag: data?.stats?.mtime?.toISOString(),
								uri: data?.path,
								type: FileType.FileSystem
							}))
					  )
					: (!!configurationService.sharePointFolder
							? sharePointService.getLastAddedFileDataFromFolder(
									configurationService.sharePointFolder,
									nameFilter
							  )
							: !!configurationService.fileURL
							? sharePointService.getFileByURL(configurationService.fileURL)
							: EMPTY
					  ).pipe(
							map(data => {
								return {
									etag: data?.ETag ?? data?.__metadata?.etag,
									uri: data?.__metadata?.id ?? data?.__metadata?.media_src,
									type: FileType.SharePoint
								};
							})
					  )
				).pipe(
					retry(retryConfig),
					mergeMap(async fileData => {
						if (!fileData.uri) {
							logger.warn(`No file(s) found`);

							return EMPTY;
						}

						const cachedETag =
							(await cache.get<string>(
								(configurationService.sharePointFolder ?? configurationService.fileURL)?.href ??
									configurationService.filePath ??
									``
							)) ?? null;

						if (cachedETag == fileData.etag) {
							logger.log(`No changes`);

							return EMPTY;
						}

						return (
							fileData.type == FileType.SharePoint
								? sharePointService.getFileContent(
										new URL(`${fileData.uri}${!!configurationService.sps2010 ? '' : '//$value'}`)
								  )
								: // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								  fileSystemService.getFileContent(fileData.uri)
						).pipe(
							retry(retryConfig),

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
								const maxColumn = usedRange?.maxColumn ?? 0;

								const header =
									headerRow == 0
										? toArray(range(1, maxColumn).pipe(mapIx(excelService.columnNumberToName)))
										: toArray(
												from(
													Array.from({
														...excelService
															.getSheetData<string | null>(worksheet, {
																header: 1,
																range: worksheet['!ref']?.replace(
																	/\d+/g,
																	`${Math.max(headerRow, 1)}`
																),
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

								const dataRows = excelService.getSheetData<any>(worksheet, {
									header,
									range: `A${headerRow + 1}:${usedRange?.maxColumnName}${usedRange?.maxRow}`,
									...(configurationService.includeBlankColumns ? { defval: null } : {})
								});

								return of(dataRows);
							}),
							retry(retryConfig),
							tap(() =>
								logger.log(
									`Sheet ${
										typeof configurationService.sheet == `number`
											? `index ${configurationService.sheet}`
											: `'${configurationService.sheet}'`
									} data extracted`
								)
							),

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
													.replaceAll(nonAlphaNumericStarOnlyBeforeLettersRegExp, ``)
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
								logger.log(`Writing data to BigQuery`);
								return outputService.outputToBigQuery(dataRows, schema);
							}),
							retry(retryConfig),
							tap(() => {
								logger.log(`Data written to BigQuery`);

								cache.set(
									(configurationService.sharePointFolder ?? configurationService.fileURL)?.href ??
										configurationService.filePath ??
										``,
									fileData.etag
								);
							})
						);
					}),
					switchAll()
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

import { CACHE_MANAGER, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { from, toArray } from 'ix/iterable';
import { flat, flatMap, groupBy, map as mapIx, orderBy } from 'ix/iterable/operators';
import moment from 'moment';
import {
	EMPTY,
	firstValueFrom,
	map,
	mergeMap,
	of,
	retry,
	RetryConfig,
	switchAll,
	tap,
	timer
} from 'rxjs';
import { AppModule } from './app.module';
import { ConfigurationService } from './configuration/configuration.service';
import { ExcelService } from './excel/excel.service';
import { OutputService } from './output/output.service';
import { SharePointService } from './sharepoint/sharepoint.service';
import { getAdditionalProperties } from './utils';

async function bootstrap() {
	//const app = await NestFactory.create(AppModule);
	const app = await NestFactory.createApplicationContext(AppModule);

	const configurationService = app.get(ConfigurationService);
	const sharePointService = app.get(SharePointService);
	const excelService = app.get(ExcelService);
	const outputService = app.get(OutputService);
	const cache = app.get<Cache>(CACHE_MANAGER);

	const logger = new Logger(`main`);

	const nonAlphaNumericRegExp = /[^A-Z0-9]/gi;
	const nonAlphaNumericStartRegExp = /^[^A-Z0-9]+/gi;
	const nonAlphaNumericEndRegExp = /[^A-Z0-9]+$/gi;

	const retryConfig: RetryConfig = {
		count: configurationService.retries,
		delay: configurationService.retryDelay,
		resetOnSuccess: true
	};

	const nameFilter = !!configurationService.filename
		? `Name eq '${configurationService.filename}'`
		: undefined;

	while (true) {
		logger.log(`Starting extraction`);

		try {
			await firstValueFrom(
				sharePointService
					.getLastAddedFileDataFromFolder(configurationService.sharePointFolder, nameFilter)
					.pipe(
						retry(retryConfig),
						mergeMap(async fileData => {
							if (!fileData) {
								logger.warn(`No files found in ${configurationService.sharePointFolder}`);

								return EMPTY;
							}

							const cachedETag = await cache.get<string>(
								configurationService.sharePointFolder.href
							);

							if (cachedETag == fileData.ETag) {
								logger.log(`No changes`);

								return EMPTY;
							}

							const fileURL = new URL(`${fileData.__metadata.id}//$value`);

							return sharePointService.getFileContent(fileURL).pipe(
								retry(retryConfig),

								mergeMap(excelFile => {
									const worksheet = excelService.getSheet(excelFile, configurationService.sheet, {
										cellFormula: false,
										cellHTML: false,
										cellDates: true,
										cellText: false,
										raw: true
									});

									const headerRowNumber = configurationService.headerRow;

									const header = toArray(
										from(
											excelService.getSheetData<string | null>(worksheet, {
												header: 1,
												range: worksheet['!ref']?.replace(/\d+/g, `${headerRowNumber + 1}`)
											})
										).pipe(
											flat(1),
											mapIx((columnName, index) => ({
												name: columnName?.trim() ?? ``,
												index
											})),
											groupBy(columnInfo => columnInfo.name),
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
										range: headerRowNumber + 1
									});

									return of(dataRows);
								}),
								retry(retryConfig),
								tap(() => logger.log(`${configurationService.sheet} sheet data extracted`)),

								map(dataRows =>
									from(dataRows).pipe(
										mapIx(dataRow =>
											Object.fromEntries(
												Object.entries(dataRow).map(([key, value]) => {
													const newKey = key
														.replaceAll(nonAlphaNumericRegExp, `_`)
														.replaceAll(nonAlphaNumericStartRegExp, ``)
														.replaceAll(nonAlphaNumericEndRegExp, ``);

													let newValue = value;

													if (value instanceof Date)
														newValue = moment(value)
															.add(1, `millisecond`) // Fixes time being displayed 1s less than what is in source Excel file
															.format(`YYYY-MM-DD HH:mm:ss`);
													else if (typeof newValue == 'string') {
														if (newValue.trim().length == 0) newValue = null;
													}

													return [newKey, newValue];
												})
											)
										)
									)
								),

								mergeMap(dataRows => {
									return outputService.outputToBigQuery(dataRows);
								}),
								retry(retryConfig),
								tap(() => {
									logger.log(`Data written to BigQuery`);

									cache.set(configurationService.sharePointFolder.href, fileData.ETag);
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

import { CACHE_MANAGER, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { from } from 'ix/iterable';
import { map as mapIx } from 'ix/iterable/operators';
import * as moment from 'moment';
import {
	EMPTY,
	firstValueFrom,
	map,
	mergeMap,
	retry,
	RetryConfig,
	switchAll,
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

	while (true) {
		logger.log(`Starting extraction`);

		try {
			await firstValueFrom(
				sharePointService
					.getLastAddedFileDataFromFolder(configurationService.sharePointFolder)
					.pipe(
						retry(retryConfig),
						mergeMap(async fileData => {
							if (!fileData) {
								logger.warn(
									`No files found in ${configurationService.sharePointFolder}`
								);

								return EMPTY;
							}

							const cachedETag = await cache.get<string>(
								configurationService.sharePointFolder.href
							);

							const fileURL = new URL(`${fileData.__metadata.id}//$value`);

							if (cachedETag == fileData.ETag) {
								logger.log(`No changes in ${fileURL.href}`);

								return EMPTY;
							}

							return sharePointService.getFileContent(fileURL).pipe(
								retry(retryConfig),

								mergeMap(excelFile => {
									const dataRows = excelService.getSheetData<any>(
										excelFile,
										configurationService.sheet,
										{
											cellFormula: false,
											cellHTML: false,
											cellDates: true,
											cellText: false,
											raw: true
										},
										{ range: 1 }
									);

									logger.log(
										`${configurationService.sheet} sheet data extracted`
									);

									return dataRows;
								}),
								retry(retryConfig),

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
									const job = outputService.outputToBigQuery(dataRows);

									logger.log(`Data written to BigQuery`);

									return job;
								}),
								retry(retryConfig)
							);
						}),
						switchAll()
					)
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
		const msToStartAnotherExtraction = Math.max(
			nextExtractionStart.diff(now),
			0
		);

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

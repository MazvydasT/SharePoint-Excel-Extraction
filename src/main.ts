import { CACHE_MANAGER, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { from } from 'ix/iterable';
import * as moment from 'moment';
import { EMPTY, firstValueFrom, mergeMap, retry, RetryConfig, switchAll, timer } from 'rxjs';
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

  const retryConfig: RetryConfig = {
    count: configurationService.retries,
    delay: configurationService.retryDelay,
    resetOnSuccess: true
  };

  while (true) {
    logger.log(`Starting extraction`);

    try {
      await firstValueFrom(sharePointService.getLastAddedFileDataFromFolder(configurationService.sharePointFolder).pipe(
        retry(retryConfig),
        mergeMap(async fileData => {
          if (!fileData) {
            logger.warn(`No files found in ${configurationService.sharePointFolder}`);

            return EMPTY;
          }

          const cachedETag = await cache.get<string>(configurationService.sharePointFolder.href);

          if (cachedETag == fileData.ETag) {
            logger.log(`No changes in ${fileData.__metadata.id}`);

            return EMPTY;
          }

          return sharePointService.getFileContent(new URL(fileData.__metadata.id)).pipe(
            retry(retryConfig),
            mergeMap(excelFile => excelService.getSheetData(excelFile, configurationService.sheet, {
              cellFormula: false,
              cellHTML: false,
              cellDates: true,
              cellText: false,
              raw: true
            }, { range: 1 })),
            retry(retryConfig),
            mergeMap(dataRows => outputService.outputToBigQuery(from(dataRows))),
            retry(retryConfig)
          )
        }),
        switchAll()
      ));
    }

    catch (error) {
      logger.error(error, ...getAdditionalProperties(error), error.stack);

      // Persistent error cooldown
      logger.log(`Persistent error occured. Will retry in ${moment.duration(configurationService.persistentErrorCooldown).humanize()}.`);
      await firstValueFrom(timer(configurationService.persistentErrorCooldown));

      continue;
    }

    const cron = configurationService.cron;

    if (!cron) break;

    const now = moment();

    cron.reset(now.toDate());

    const nextExtractionStart = moment(cron.next().value.toDate());
    const msToStartAnotherExtraction = Math.max(nextExtractionStart.diff(now), 0);

    logger.log(`Next extraction will start in ${moment.duration(msToStartAnotherExtraction).humanize()} ${nextExtractionStart.calendar({
      sameDay: `[today at] HH:mm`,
      nextDay: `[tomorrow at] HH:mm`,
      nextWeek: `[on] dddd [at] HH:mm`
    })}`);

    await firstValueFrom(timer(msToStartAnotherExtraction));
  }

  //await app.listen(3000);
}

bootstrap();
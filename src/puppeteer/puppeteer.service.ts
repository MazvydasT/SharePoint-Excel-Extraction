import { Injectable } from '@nestjs/common';
import { Browser, launch } from 'puppeteer';
import { mergeMap, Observable } from 'rxjs';
import { TempDirService } from '../temp-dir/temp-dir.service';

@Injectable()
export class PuppeteerService {
	constructor(private tempDirService: TempDirService) {}

	executeInBrowser<T>(handler: (browser: Browser) => Promise<T>) {
		return this.tempDirService.getTempDir().pipe(
			mergeMap(
				disposableTempDirObject =>
					new Observable<T>(subscriber => {
						const browserPromise = launch({
							headless: true,
							userDataDir: disposableTempDirObject.path
						});

						browserPromise.then(async browser => {
							try {
								const handlerResult = await handler(browser);

								subscriber.next(handlerResult);
								subscriber.complete();
							} catch (error) {
								subscriber.error(error);
							}
						});

						return () => {
							browserPromise
								.catch(() => null)
								.then(browser => browser?.close())
								.catch(() => {})
								.then(() => disposableTempDirObject.remove())
								.catch(() => {});
						};
					})
			)
		);
	}
}

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
						}).catch(reason => {
							subscriber.error(reason);
							return null;
						});

						browserPromise.then(async browser => {
							try {
								if (!!browser) {
									const handlerResult = await handler(browser);

									subscriber.next(handlerResult);
								}

								subscriber.complete();
							} catch (error) {
								subscriber.error(error);
							}
						});

						return () =>
							browserPromise
								.then(browser => browser?.close())
								.catch(() => {})
								.then(() => disposableTempDirObject.remove())
								.catch(() => {});
					})
			)
		);
	}
}

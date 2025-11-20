import { Injectable } from '@nestjs/common';
import { Browser, launch } from 'puppeteer';
import { Observable } from 'rxjs';

@Injectable()
export class PuppeteerService {
	executeInBrowser<T>(handler: (browser: Browser) => Promise<T>) {
		return new Observable<T>(subscriber => {
			const browserPromise = launch({
				headless: true
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
				browserPromise.catch(() => null).then(browser => browser?.close().catch(() => {}));
			};
		});
	}
}

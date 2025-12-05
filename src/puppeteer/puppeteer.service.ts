import { Injectable } from '@nestjs/common';
import { Browser, launch } from 'puppeteer';
import { TempDirService } from '../temp-dir/temp-dir.service';

@Injectable()
export class PuppeteerService {
	constructor(private tempDirService: TempDirService) {}

	async executeInBrowser<T>(handler: (browser: Browser) => Promise<T>) {
		await using disposableTempDirObject = await this.tempDirService.getTempDir();

		const browser = await launch({
			headless: true,
			userDataDir: disposableTempDirObject.path
		});

		return await handler(browser).finally(() => browser.close());
	}
}

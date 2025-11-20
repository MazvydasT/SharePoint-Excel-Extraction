import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { from, mergeMap, of, tap } from 'rxjs';
import { ConfigurationService } from '../configuration/configuration.service';
import { PuppeteerService } from '../puppeteer/puppeteer.service';
import { IAuthHeaders } from './IAuthHeaders';

@Injectable()
export class SharePointAuthService {
	constructor(
		private configurationService: ConfigurationService,
		private puppeteerService: PuppeteerService,
		@Inject(CACHE_MANAGER) private cache: Cache
	) {}

	getAuth(url: URL, username: string, password: string) {
		return !!this.configurationService.ntlm
			? of({} as IAuthHeaders)
			: this.getAuthByBrowser(url.origin, username, password);
	}

	private getAuthByBrowser(url: string, username: string, password: string) {
		const cacheKey = `browserIAuthResponse`;
		const cacheTimeToLive = 5 /*m*/ * 60 /*s*/ * 1000; /*ms*/

		return from(this.cache.get<IAuthHeaders>(cacheKey)).pipe(
			mergeMap(authHeaders =>
				!!authHeaders
					? of(authHeaders)
					: this.puppeteerService.executeInBrowser(async browser => {
							const page = await browser.newPage();

							const [emailInput, submitButton] = await Promise.all([
								page.waitForSelector(`input[name="loginfmt"]`),
								page.waitForSelector(`input[type="submit"]`),
								page.goto(url)
							]);

							await emailInput?.asLocator().fill(username);

							const [rsaTokenButton] = await Promise.all([
								page.waitForSelector(`[aria-label="Active Directory"]`),
								submitButton?.click()
							]);

							await page.authenticate({ username, password });

							await Promise.all([
								page.waitForResponse(response => response.url().startsWith(url)),
								rsaTokenButton?.click()
							]);

							const cookies = await browser.cookies();

							const authHeaders: IAuthHeaders = {
								headers: {
									Cookie: cookies
										.filter(({ name }) => name == `rtFa` || name == `FedAuth`)
										.map(({ name, value }) => `${name}=${value}`)
										.join(`; `)
								}
							};

							return authHeaders;
						})
			),
			tap(async authHeaders => await this.cache.set(cacheKey, authHeaders, cacheTimeToLive))
		);
	}
}

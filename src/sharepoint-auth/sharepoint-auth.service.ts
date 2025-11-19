import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { from, mergeMap, of } from 'rxjs';
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
			: this.getAuthByBrowser(`${url.origin}/Pages/PageNotFoundError.aspx`, username, password);
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
							await page.authenticate({ username, password });

							page.goto(url);

							const [emailInput, submitButton] = await Promise.all([
								page.waitForSelector(`input[name="loginfmt"]`),
								page.waitForSelector(`input[type="submit"]`)
							]);

							await emailInput?.asLocator().fill(username);

							submitButton?.click();

							const rsaTokenButton = await page.waitForSelector(`[aria-label="Active Directory"]`);

							rsaTokenButton?.click();

							await page.waitForSelector(`#UserProfileDisplayName`);

							const cookies = await browser.cookies();

							const authHeaders: IAuthHeaders = {
								headers: {
									Cookie: cookies
										.filter(({ name }) => name == `rtFa` || name == `FedAuth`)
										.map(({ name, value }) => `${name}=${value}`)
										.join(`; `)
								}
							};

							await this.cache.set(cacheKey, authHeaders, cacheTimeToLive);

							return authHeaders;
						})
			)
		);
	}
}

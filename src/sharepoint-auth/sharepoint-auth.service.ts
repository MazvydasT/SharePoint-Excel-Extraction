import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ElementHandle } from 'puppeteer';
import { from, mergeMap, of, timeout } from 'rxjs';
import { ConfigurationService } from '../configuration/configuration.service';
import { PuppeteerService } from '../puppeteer/puppeteer.service';
import { IAuthHeaders } from './IAuthHeaders';
import { GET_AUTH_COMMAND, SHAREPOINT_AUTH_MICROSERVICE } from './sharepoint-auth.constants';

@Injectable()
export class SharePointAuthService {
	constructor(
		private configurationService: ConfigurationService,
		private puppeteerService: PuppeteerService,
		@Inject(CACHE_MANAGER) private cache: Cache,
		@Inject(SHAREPOINT_AUTH_MICROSERVICE) private sharePointAuthMicroserviceClient: ClientProxy
	) {}

	getAuth(url: string, username: string, password: string) {
		const { origin } = new URL(url);

		return !!this.configurationService.doNotUseSharePointAuthService ||
			!!this.configurationService.sharePointAuthService
			? this.getAuthByBrowser(origin, username, password)
			: this.getAuthFromSharePointAuthMicroservice(origin, username, password);
	}

	private inFlightExecutionsInBrowser = new Map<string, Promise<IAuthHeaders>>();
	private getAuthByBrowser(url: string, username: string, password: string) {
		const cacheKey = `${url}@${username}:${password}`;
		const cacheTimeToLive = 5 /*m*/ * 60 /*s*/ * 1000; /*ms*/

		return from(this.cache.get<IAuthHeaders>(cacheKey)).pipe(
			mergeMap(authHeaders => {
				if (!!authHeaders) return of(authHeaders);
				else {
					let inFlightExecutionInBrowser = this.inFlightExecutionsInBrowser.get(cacheKey);

					if (!inFlightExecutionInBrowser) {
						this.inFlightExecutionsInBrowser.set(
							cacheKey,
							(inFlightExecutionInBrowser = this.puppeteerService
								.executeInBrowser(async browser => {
									const page = await browser.newPage();

									await page.goto(url);

									const emailInput = page.locator(`input[name="loginfmt"]`);
									const submitButton = page.locator(`input[type="submit"]`);

									await emailInput.fill(username);

									const abortController = new AbortController();
									const abortSignal = abortController.signal;

									const [rsaTokenButton] = await Promise.all([
										page
											.waitForSelector(`[aria-label="Active Directory"]`)
											.finally(() => abortController.abort()),

										(async () => {
											let signInOptionPicker: ElementHandle<Element> | null = null;
											let usePasswordOption: ElementHandle<Element> | null = null;

											try {
												signInOptionPicker = await page.waitForSelector(
													`#idA_PWD_SwitchToCredPicker`,
													{ signal: abortSignal }
												);

												await signInOptionPicker?.click();

												usePasswordOption = await page.waitForSelector(
													`::-p-text(Use my password)`,
													{ signal: abortSignal }
												);

												await usePasswordOption?.click();
											} catch (_) {
											} finally {
												await signInOptionPicker?.dispose();
												await usePasswordOption?.dispose();
											}
										})(),

										submitButton.click()
									]);

									await page.authenticate({ username, password });

									await Promise.all([
										page.waitForResponse(response => response.url().startsWith(url)),
										rsaTokenButton?.click()
									]);

									await rsaTokenButton?.dispose();

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
								.finally(() => {
									this.inFlightExecutionsInBrowser.delete(cacheKey);
								}))
						);
					}

					return inFlightExecutionInBrowser;
				}
			})
		);
	}

	private getAuthFromSharePointAuthMicroservice(url: string, username: string, password: string) {
		return this.sharePointAuthMicroserviceClient
			.send<IAuthHeaders>(GET_AUTH_COMMAND, {
				url,
				username,
				password
			})
			.pipe(timeout(60000));
	}
}

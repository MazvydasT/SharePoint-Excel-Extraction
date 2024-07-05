import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { NtlmClient } from 'axios-ntlm';
import { Agent } from 'https';
import { from, toArray } from 'ix/iterable';
import { map as mapIx } from 'ix/iterable/operators';
import { map, mergeMap } from 'rxjs';
import { ConfigurationService } from '../configuration/configuration.service';
import { SharePointAuthService } from '../sharepoint-auth/sharepoint-auth.service';
import { IRESTOptions } from './IRESTOptions';
import { ISharePointFileByURLData } from './ISharePointFileByURLData';
import { ISharePointFileData } from './ISharePointFileData';
import { ISharePointFilesData } from './ISharePointFilesData';

export enum Order {
	asc,
	desc
}

const ACCEPT_JSON = Object.freeze({
	Accept: `application/json;odata=verbose`
});

@Injectable()
export class SharePointService {
	constructor(
		private httpService: HttpService,
		private sharePointAuthService: SharePointAuthService,
		private configurationService: ConfigurationService
	) {}

	private getRequest<T>(url: URL, config: AxiosRequestConfig<T> = {}) {
		return this.sharePointAuthService
			.getAuth(url, this.configurationService.username, this.configurationService.password)
			.pipe(
				mergeMap(authResponse => {
					const requestConfig: AxiosRequestConfig = {
						method: `GET`,
						...config,
						url: url.href,
						headers: {
							...config.headers,
							...authResponse.headers
						}
					};

					let httpServiceReference = this.httpService;

					if (!!this.configurationService.ntlm) {
						requestConfig.proxy = false;
						requestConfig.timeout = 10000;
						requestConfig.httpsAgent = new Agent({
							keepAlive: true,
							rejectUnauthorized: false,
							minVersion: `TLSv1`
						});

						httpServiceReference = NtlmClient(
							{
								username: this.configurationService.username,
								password: this.configurationService.password,
								domain: this.configurationService.domain
							},
							requestConfig as any
						) as any as HttpService;
					}

					return httpServiceReference.request<T>(requestConfig);
				})
			);
	}

	private getSite(url: URL) {
		const siteMatch = url.pathname.match(/^(.*?(?:sites|personal)\/.+?\/).*$/);
		const site = !!siteMatch ? siteMatch[1] : null;

		return site ?? ``;
	}

	getFileByURL(fileURL: URL) {
		const site = this.getSite(fileURL);

		const isSPS2010 = !!this.configurationService.sps2010;

		const filesRequestURL = isSPS2010
			? fileURL
			: new URL(`${fileURL.origin}${site}_api/web/GetFileByUrl('${encodeURI(fileURL.pathname)}')`);

		return this.getRequest<ISharePointFileByURLData>(filesRequestURL, {
			method: isSPS2010 ? `HEAD` : `GET`,
			headers: { ...ACCEPT_JSON }
		}).pipe(
			map(response => {
				const etag = response.headers[`etag`];

				return isSPS2010
					? ({
							__metadata: {
								etag,
								media_src: fileURL.href
							}
					  } as ISharePointFileData)
					: response.data.d;
			})
		);
	}

	private getFilesInFolder<T>(folderURL: URL, restOptions?: IRESTOptions) {
		const site = this.getSite(folderURL);

		let filesRequestURL: URL;

		if (!!this.configurationService.sps2010) {
			const [library] = decodeURI(folderURL.href).split(`/`).reverse();

			filesRequestURL = new URL(
				`${folderURL.origin}${site}_vti_bin/listdata.svc/${library.replaceAll(' ', '')}`
			);
		} else {
			filesRequestURL = new URL(
				`${folderURL.origin}${site}_api/web/GetFolderByServerRelativeUrl('${encodeURI(
					folderURL.pathname
				)}')/Files`
			);
		}

		if (!!restOptions) {
			const searchParams = filesRequestURL.searchParams;

			if (!!restOptions.filter && restOptions.filter.trim().length > 0)
				searchParams.set(`$filter`, restOptions.filter);

			if (!!restOptions.select && restOptions.select.length > 0)
				searchParams.set(`$select`, restOptions.select.join(`,`));

			if (!!restOptions.orderby && restOptions.orderby.length > 0)
				searchParams.set(
					`$orderby`,
					toArray(
						from(restOptions.orderby).pipe(
							mapIx(item => `${item.field} ${item.order ? Order[item.order] : ''}`.trim())
						)
					).join(`,`)
				);

			if (!!restOptions.top) searchParams.set(`$top`, `${restOptions.top}`);
		}

		return this.getRequest<T>(filesRequestURL, {
			headers: { ...ACCEPT_JSON }
		}).pipe(
			map(response => {
				return response.data;
			})
		);
	}

	getFileContent(fileURL: URL) {
		return this.getRequest<Buffer>(fileURL, {
			responseType: 'arraybuffer'
		}).pipe(
			map(response => {
				return response.data;
			})
		);
	}

	getLastAddedFileDataFromFolder(folderURL: URL, filter?: string) {
		return this.getFilesInFolder<ISharePointFilesData>(folderURL, {
			filter,
			...(!!this.configurationService.sps2010 ? {} : { select: [`ETag`] }),
			orderby: [
				{
					field: !!this.configurationService.sps2010 ? `Created` : `TimeCreated`,
					order: Order.desc
				}
			],
			top: 1
		}).pipe(
			map(filesData => {
				if (Array.isArray(filesData.d)) {
					filesData.d = { results: filesData.d };
				}

				return filesData;
			}),
			map(filesData => {
				return filesData.d.results.shift();
			})
		);
	}
}

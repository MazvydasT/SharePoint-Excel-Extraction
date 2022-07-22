import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { from, toArray } from 'ix/iterable';
import { map as mapIx } from 'ix/iterable/operators';
import { map, mergeMap } from 'rxjs';
import { ConfigurationService } from '../configuration/configuration.service';
import { SharePointAuthService } from '../sharepoint-auth/sharepoint-auth.service';
import { IRESTOptions } from './IRESTOptions';
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

	getRequest<T>(url: URL, config: AxiosRequestConfig<T> = {}) {
		return this.sharePointAuthService
			.getAuth(url, this.configurationService.username, this.configurationService.password)
			.pipe(
				mergeMap(authResponse => {
					return this.httpService.get<T>(url.href, {
						...config,
						headers: {
							...config.headers,
							...authResponse.headers
						}
					});
				})
			);
	}

	getFilesInFolder<T>(folderURL: URL, restOptions?: IRESTOptions) {
		const siteMatch = folderURL.pathname.match(/^(.*?sites\/.+?\/).*$/);
		const site = !!siteMatch ? siteMatch[1] : null;

		const filesRequestURL = new URL(
			`${folderURL.origin}${site}_api/web/GetFolderByServerRelativeUrl('${encodeURI(
				folderURL.pathname
			)}')/Files`
		);

		if (!!restOptions) {
			const searchParams = filesRequestURL.searchParams;

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

	getLastAddedFileDataFromFolder(folderURL: URL) {
		return this.getFilesInFolder<ISharePointFilesData>(folderURL, {
			select: [`ETag`],
			orderby: [
				{
					field: `TimeCreated`,
					order: Order.desc
				}
			],
			top: 1
		}).pipe(map(filesData => filesData.d.results.shift()));
	}
}

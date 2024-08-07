import { BigQuery, Job, TableSchema } from '@google-cloud/bigquery';
import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Readable } from 'stream';
import { ConfigurationService } from '../configuration/configuration.service';

@Injectable()
export class BigQueryService {
	constructor(private configurationService: ConfigurationService) {}

	private bigQueryDataset = new BigQuery({
		projectId: this.configurationService.bigQueryProject,
		keyFilename: this.configurationService.bigQueryKeyFilename
	}).dataset(this.configurationService.bigQueryDataset);

	write(readable: Readable, bigQueryTableName: string, schema?: TableSchema) {
		const bigQueryTable = this.bigQueryDataset.table(bigQueryTableName);

		return new Observable<Job>(subscriber => {
			readable
				.pipe(
					bigQueryTable.createWriteStream({
						sourceFormat: `NEWLINE_DELIMITED_JSON`,
						writeDisposition: `WRITE_TRUNCATE`,
						autodetect: !schema,
						schema
					})
				)
				.on(`complete`, job => {
					subscriber.next(job);
					subscriber.complete();
				})
				.on(`error`, err => subscriber.error(err));
		});
	}
}

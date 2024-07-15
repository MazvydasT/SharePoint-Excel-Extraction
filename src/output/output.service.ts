import { TableSchema } from '@google-cloud/bigquery';
import { Injectable } from '@nestjs/common';
import { IterableX } from 'ix/Ix.iterable';
import { Readable } from 'stream';
import { BigQueryService } from '../big-query/big-query.service';

@Injectable()
export class OutputService {
	constructor(private bigQueryService: BigQueryService) {}

	private itemsArrayToReadable(itemsIterator: Iterator<any>) {
		return new Readable({
			read() {
				const result = itemsIterator.next();

				this.push(result.done ? null : `${JSON.stringify(result.value)}\n`);
			}
		});
	}

	outputToBigQuery(items: IterableX<any>, bigQueryTableName: string, schema?: TableSchema) {
		return this.bigQueryService.write(
			this.itemsArrayToReadable(items[Symbol.iterator]()),
			bigQueryTableName,
			schema
		);
	}
}

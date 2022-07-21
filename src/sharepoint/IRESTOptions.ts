import { Order } from './sharepoint.service';

export interface IRESTOptions {
	select?: string[];
	orderby?: {
		field: string;
		order?: Order;
	}[];
	top?: number;
}

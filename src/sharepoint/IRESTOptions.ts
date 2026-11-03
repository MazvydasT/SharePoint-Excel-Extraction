import { Order } from './sharepoint.service.js';

export interface IRESTOptions {
  filter?: string;
  select?: string[];
  orderby?: {
    field: string;
    order?: Order;
  }[];
  top?: number;
}

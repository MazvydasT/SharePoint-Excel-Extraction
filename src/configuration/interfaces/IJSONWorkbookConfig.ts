import { ISharedSheetConfig } from './ISharedSheetConfig';
import { ISharedWorkbookConfig } from './ISharedWorkbookConfig';

/**
 * @minItems 1
 */
type ISharedSheetConfigArray = ISharedSheetConfig[];

/**
 * Sheet level configuration(s)
 */
export interface IJSONWorkbookConfig extends ISharedWorkbookConfig {
	sheetConfig: ISharedSheetConfig | ISharedSheetConfigArray;
}

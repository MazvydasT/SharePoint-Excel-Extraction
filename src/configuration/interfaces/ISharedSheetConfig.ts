import { ISharedGlobalSheetConfig } from './ISharedGlobalSheetConfig';
import { ISharedGlobalWorkbookSheetConfig } from './ISharedGlobalWorkbookSheetConfig';

export interface ISharedSheetConfig
	extends ISharedGlobalWorkbookSheetConfig,
		ISharedGlobalSheetConfig {}

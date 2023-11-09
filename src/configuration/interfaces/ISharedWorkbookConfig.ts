import { ISharedGlobalWorkbookConfig } from './ISharedGlobalWorkbookConfig';
import { ISharedGlobalWorkbookSheetConfig } from './ISharedGlobalWorkbookSheetConfig';

export interface ISharedWorkbookConfig
	extends ISharedGlobalWorkbookConfig,
		ISharedGlobalWorkbookSheetConfig {}

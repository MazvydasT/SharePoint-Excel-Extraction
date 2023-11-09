import { ISharedGlobalSheetConfig } from './ISharedGlobalSheetConfig';
import { ISharedGlobalWorkbookConfig } from './ISharedGlobalWorkbookConfig';
import { ISharedGlobalWorkbookSheetConfig } from './ISharedGlobalWorkbookSheetConfig';

export interface ISharedGlobalConfig
	extends ISharedGlobalWorkbookConfig,
		ISharedGlobalSheetConfig,
		ISharedGlobalWorkbookSheetConfig {}

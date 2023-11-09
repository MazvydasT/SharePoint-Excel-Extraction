import { IJSONWorkbookConfig } from './IJSONWorkbookConfig';
import { ISharedGlobalConfig } from './ISharedGlobalConfig';

/**
 * @minItems 1
 */
type IJSONWorkbookConfigArray = IJSONWorkbookConfig[];

export interface IJSONConfig extends ISharedGlobalConfig {
	$schema?: string;

	/**
	 * Workbook/file level configuration(s)
	 */
	workbookConfig: IJSONWorkbookConfig | IJSONWorkbookConfigArray;
}

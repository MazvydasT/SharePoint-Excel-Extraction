export interface ISharedGlobalWorkbookSheetConfig {
	headerRow?: number;

	includeBlankColumns?: boolean;

	retry?: number;
	retryDelay?: number;

	persistentErrorCooldown?: number;

	bqkeyfile?: string;
	bqproject?: string;
	bqdataset?: string;
	bqtable?: string;
}

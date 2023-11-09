export interface ISharedGlobalWorkbookConfig {
	httpsProxy?: string;

	username?: string;
	password?: string;

	cron?: string | string[];
	//cron?: CronExpression<true> | CronExpression<true>[];

	sps2010?: boolean;
	ntlm?: boolean;
	domain?: string;

	sharePointFolder?: URL;

	filename?: string;

	fileUrl?: URL;
	filePath?: string;
}

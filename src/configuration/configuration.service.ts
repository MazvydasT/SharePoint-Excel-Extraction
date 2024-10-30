import { Injectable } from '@nestjs/common';
import { Command, InvalidArgumentError, Option } from 'commander';
import { CronExpression, parseExpression } from 'cron-parser';
import { config } from 'dotenv';
import { parseIntClamp } from '../utils';

@Injectable()
export class ConfigurationService {
	private readonly optionValues = (() => {
		const envOption = new Option(`--env <path>`, `Path to .env file`).env(`ENV`);

		try {
			const envPath = new Command()
				.addOption(envOption)
				.configureOutput({
					writeErr: () => null,
					writeOut: () => null
				})
				.exitOverride()
				.parse()
				.opts<{ env?: string }>().env;

			config({ path: envPath, override: true });
		} catch (_) {}

		const sharePointFolderOption = `--share-point-folder`;
		const fileURLOption = `--file-url`;
		const filePathOption = `--file-path`;

		const multipleFilesOption = `--multiple-files`;
		const bqTableOption = `--bqtable`;

		const command = new Command()
			.addOption(envOption)

			.addOption(
				new Option(`-f, ${sharePointFolderOption} <address>`, `SharePoint folder address`)
					.env(`SHAREPOINT_FOLDER`)
					.argParser(value => {
						try {
							return new URL(value);
						} catch (_) {
							throw new InvalidArgumentError(``);
						}
					})
			)
			.addOption(new Option(`--filename <name>`, `Name of file to extract`).env(`FILENAME`))

			.addOption(
				new Option(`${fileURLOption} <address>`, `File address`)
					.env(`FILE_URL`)
					.argParser(value => {
						try {
							return new URL(value);
						} catch (_) {
							throw new InvalidArgumentError(``);
						}
					})
			)

			.addOption(new Option(`--sps2010`, `Get file from SharePoint Server 2010`).env(`SPS2010`))
			.addOption(new Option(`--ntlm`, `Use NTLM authentication`).env(`NTLM`))
			.addOption(
				new Option(`--domain <name>`, `Domain name, used with NTLM authentication`)
					.env(`DOMAIN`)
					.default(process.env.USERDOMAIN ?? ``)
			)

			.addOption(
				new Option(`${filePathOption} <path>`, `File path or glob pattern`).env(`FILE_PATH`)
			)

			.addOption(
				new Option(`-s, --sheet <name>`, `Sheet name or index to extract`).env(`SHEET`).default(0)
				//.makeOptionMandatory(true)
			)
			.addOption(
				new Option(`-h, --header-row <number>`, `Header row number`)
					.env(`HEADER_ROW`)
					.default(0)
					.argParser(value => {
						try {
							return parseIntClamp(value, { min: 0 });
						} catch (_) {
							throw new InvalidArgumentError(``);
						}
					})
			)
			.addOption(
				new Option(`-d, --data-row <number>`, `First data row number`)
					.env(`DATA_ROW`)
					.argParser(value => {
						try {
							return parseIntClamp(value, { min: 1 });
						} catch (_) {
							throw new InvalidArgumentError(``);
						}
					})
			)

			.addOption(
				new Option(
					`-m, ${multipleFilesOption}`,
					`Multiple files get extracted into multiple tables`
				)
					.env(`MULTIPLE_FILES`)
					.default(false)
			)

			.addOption(new Option(`--include-blank-columns`).env(`INCLUDE_BLANK_COLUMNS`).default(false))

			.addOption(
				new Option(`-u, --username <string>`, `SharePoint username`)
					.env(`USERNAME`)
					.makeOptionMandatory(true)
			)
			.addOption(
				new Option(`-p, --password <string>`, `SharePoint password`)
					.env(`PASSWORD`)
					.makeOptionMandatory(true)
			)

			.addOption(new Option(`--https-proxy <string>`, `HTTP proxy`).env(`HTTPS_PROXY`))

			.addOption(
				new Option(`-r, --retry <count>`, `Retry errors`)
					.env(`RETRY`)
					.default(5)
					.argParser(value => {
						try {
							return parseIntClamp(value, { min: 0 });
						} catch (_) {
							throw new InvalidArgumentError(``);
						}
					})
			)
			.addOption(
				new Option(`--retry-delay <ms>`, `Time delay in ms before retrying errors`)
					.env(`RETRY_DELAY`)
					.default(10000)
					.argParser(value => {
						try {
							return parseIntClamp(value, { min: 0 });
						} catch (_) {
							throw new InvalidArgumentError(``);
						}
					})
			)

			.addOption(
				new Option(
					`-c, --persistent-error-cooldown <ms>`,
					`Time in ms between re-extarction attempts after persistent error`
				)
					.env(`PERSISTENT_ERROR_COOLDOWN`)
					.default(600000)
					.argParser(parseInt)
			)

			.addOption(
				new Option(`--cron <expression>`, `Cron expression to schedule extraction`)
					.env(`CRON`)
					.argParser(value => {
						try {
							return !value ? undefined : parseExpression(value, { iterator: true });
						} catch (_) {
							throw new InvalidArgumentError(``);
						}
					})
			)

			.addOption(
				new Option(`--bqkeyfile <filepath>`, 'BigQuery key file')
					.env(`BQKEYFILE`)
					.makeOptionMandatory(true)
			)
			.addOption(
				new Option(`--bqproject <name>`, `BigQuery project name`)
					.env(`BQPROJECT`)
					.makeOptionMandatory(true)
			)
			.addOption(
				new Option(`--bqdataset <name>`, `BigQuery dataset name`)
					.env(`BQDATASET`)
					.makeOptionMandatory(true)
			)
			.addOption(
				new Option(`${bqTableOption} <name>`, `BigQuery table name`).env(`BQTABLE`)
				//.makeOptionMandatory(true)
			)
			.addOption(
				new Option(
					`--bqtable-name-regexp <expression>`,
					`RegExp to extract table name from file name`
				)
					.env(`BQTABLE_NAME_REGEXP`)
					.argParser(value => {
						try {
							return !value ? undefined : new RegExp(value);
						} catch (_) {
							throw new InvalidArgumentError(``);
						}
					})
			)

			.showHelpAfterError(true)

			.parse();

		const options = command.opts<{
			sharePointFolder?: URL;
			filename?: string;

			fileUrl?: URL;
			filePath?: string;

			sps2010?: boolean;
			ntlm?: boolean;
			domain: string;

			sheet: string | number;
			headerRow: number;
			dataRow?: number;

			multipleFiles: boolean;
			includeBlankColumns: boolean;

			username: string;
			password: string;

			httpsProxy?: string;

			retry: number;
			retryDelay: number;

			persistentErrorCooldown: number;

			cron?: CronExpression<true>;

			bqkeyfile: string;
			bqproject: string;
			bqdataset: string;
			bqtable?: string;
			bqtableNameRegexp?: RegExp;
		}>();

		if (
			[!!options.sharePointFolder, !!options.fileUrl, !!options.filePath].filter(v => v).length != 1
		)
			command.error(
				`One and only one of the following must be set: ${[
					sharePointFolderOption,
					fileURLOption,
					filePathOption
				].join(', ')}`
			);

		if ([options.multipleFiles, !!options.bqtable].filter(v => v).length != 1)
			command.error(
				`One and only one of the following must be set: ${[multipleFilesOption, bqTableOption].join(', ')}`
			);

		return Object.freeze(options);
	})();

	get sharePointFolder() {
		return this.optionValues.sharePointFolder;
	}
	get filename() {
		return this.optionValues.filename;
	}

	get fileURL() {
		return this.optionValues.fileUrl;
	}

	get filePath() {
		return this.optionValues.filePath;
	}

	get sps2010() {
		return this.optionValues.sps2010;
	}

	get ntlm() {
		return this.optionValues.ntlm;
	}

	get domain() {
		return this.optionValues.domain;
	}

	get sheet() {
		return this.optionValues.sheet;
	}
	get headerRow() {
		return this.optionValues.headerRow;
	}

	get dataRow() {
		return this.optionValues.dataRow;
	}

	get multipleFiles() {
		return this.optionValues.multipleFiles;
	}

	get includeBlankColumns() {
		return this.optionValues.includeBlankColumns;
	}

	get username() {
		return this.optionValues.username;
	}
	get password() {
		return this.optionValues.password;
	}

	get httpsProxy() {
		return this.optionValues.httpsProxy;
	}

	get retries() {
		return this.optionValues.retry;
	}
	get retryDelay() {
		return this.optionValues.retryDelay;
	}

	get persistentErrorCooldown() {
		return this.optionValues.persistentErrorCooldown;
	}

	get cron() {
		return this.optionValues.cron;
	}

	get bigQueryKeyFilename() {
		return this.optionValues.bqkeyfile;
	}
	get bigQueryProject() {
		return this.optionValues.bqproject;
	}
	get bigQueryDataset() {
		return this.optionValues.bqdataset;
	}
	get bigQueryTable() {
		return this.optionValues.bqtable;
	}
	get bqtableNameRegExp() {
		return this.optionValues.bqtableNameRegexp;
	}
}

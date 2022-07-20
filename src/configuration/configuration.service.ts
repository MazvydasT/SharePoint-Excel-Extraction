import { Injectable } from '@nestjs/common';
import { Command, InvalidArgumentError, Option } from 'commander';
import { CronExpression, parseExpression } from 'cron-parser';
import { config } from 'dotenv';
import { parseIntClamp } from 'src/utils';

@Injectable()
export class ConfigurationService {
    private readonly optionValues = (() => {
        const envOption = new Option(`--env <path>`, `Path to .env file`).env(`ENV`);

        const envPath = new Command().addOption(envOption).parse().opts<{ env?: string }>().env;

        config({ path: envPath });

        return Object.freeze(new Command()
            .addOption(envOption)

            .addOption(new Option(`-f, --share-point-folder <address>`, `SharePoint folder address`).env(`SHAREPOINT_FOLDER`).makeOptionMandatory(true).argParser(value => {
                try {
                    return new URL(value);
                }

                catch (_) {
                    throw new InvalidArgumentError(``);
                }
            }))
            .addOption(new Option(`-s, --sheet <name>`, `Sheet name to extract`).env(`SHEET`).makeOptionMandatory(true))
            .addOption(new Option(`-h, --header-row <number>`, `Header rownumber`).env(`HEADER_ROW`).default(0).argParser(value => {
                try {
                    return parseIntClamp(value, undefined, 0);
                }

                catch (_) {
                    throw new InvalidArgumentError(``);
                }
            }))

            .addOption(new Option(`-u, --username <string>`, `SharePoint username`).env(`USERNAME`).makeOptionMandatory(true))
            .addOption(new Option(`-p, --password <string>`, `SharePoint password`).env(`PASSWORD`).makeOptionMandatory(true))

            .addOption(new Option(`--http-proxy <string>`, `HTTP proxy`).env(`HTTP_PROXY`))

            .addOption(new Option(`-r, --retry <count>`, `Retry errors`).env(`RETRY`).default(5).argParser(value => {
                try {
                    return parseIntClamp(value, undefined, 0);
                }

                catch (_) {
                    throw new InvalidArgumentError(``);
                }
            }))
            .addOption(new Option(`--retry-delay <ms>`, `Time delay in ms before retrying errors`).env(`RETRY_DELAY`).default(10000).argParser(value => {
                try {
                    return parseIntClamp(value, undefined, 0);
                }

                catch (_) {
                    throw new InvalidArgumentError(``);
                }
            }))

            .addOption(new Option(`-c, --persistent-error-cooldown <ms>`, `Time in ms between re-extarction attempts after persistent error`).env(`PERSISTENT_ERROR_COOLDOWN`).default(600000).argParser(parseInt))

            .addOption(new Option(`--cron <expression>`, `Cron expression to schedule extraction`).env(`CRON`).argParser(value => {
                try {
                    return !value ? undefined : parseExpression(value, { iterator: true });
                }

                catch (_) {
                    throw new InvalidArgumentError(``);
                }
            }))

            .addOption(new Option(`--bqkeyfile <filepath>`, 'BigQuery key file').env(`BQKEYFILE`).makeOptionMandatory(true))
            .addOption(new Option(`--bqproject <name>`, `BigQuery project name`).env(`BQPROJECT`).makeOptionMandatory(true))
            .addOption(new Option(`--bqdataset <name>`, `BigQuery dataset name`).env(`BQDATASET`).makeOptionMandatory(true))
            .addOption(new Option(`--bqtable <name>`, `BigQuery table name`).env(`BQTABLE`).makeOptionMandatory(true))

            .showHelpAfterError(true)

            .parse().opts<{
                sharePointFolder: URL;
                sheet: string;
                headerRow: number;

                username: string;
                password: string;

                httpProxy?: string;

                retry: number;
                retryDelay: number;

                persistentErrorCooldown: number;

                cron?: CronExpression<true>;

                bqkeyfile: string;
                bqproject: string;
                bqdataset: string;
                bqtable: string;
            }>());
    })();

    get sharePointFolder() { return this.optionValues.sharePointFolder; }
    get sheet() { return this.optionValues.sheet; }
    get headerRow() { return this.optionValues.headerRow; }

    get username() { return this.optionValues.username; }
    get password() { return this.optionValues.password; }

    get httpProxy() { return this.optionValues.httpProxy; }

    get retries() { return this.optionValues.retry; }
    get retryDelay() { return this.optionValues.retryDelay; }

    get persistentErrorCooldown() { return this.optionValues.persistentErrorCooldown; }

    get cron() { return this.optionValues.cron; }

    get bigQueryKeyFilename() { return this.optionValues.bqkeyfile; }
    get bigQueryProject() { return this.optionValues.bqproject; }
    get bigQueryDataset() { return this.optionValues.bqdataset; }
    get bigQueryTable() { return this.optionValues.bqtable; }
}
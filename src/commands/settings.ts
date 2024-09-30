/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as fs from 'fs';
import * as yargs from 'yargs';
import lodash from 'lodash';

import { getGitSecrets } from '@/index';
import { Toast, flatten } from '@/utils';

import { CMD } from './constants';

class SettingsListCommand implements yargs.CommandModule {
    command = 'list';
    describe = 'List settings.';

    builder(args: yargs.Argv) {
        return args.option('local', {
            alias: 'l',
            describe: 'Modify local settings',
            type: 'boolean',
        });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { local } = args as unknown as { local?: boolean };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Local settings
        if (local) {
            const localSettings = gitsecrets.getLocalSettings();
            if (!localSettings) {
                const flatObj = flatten(localSettings);
                const textLength = Math.max(...Object.keys(flatObj).map((k) => k.length));

                Toast.success('***** Local Settings *****\n\n');
                Object.entries(flatObj).map(([key, value]) => {
                    console.log(`${key.padEnd(textLength)}: ${value}`);
                });
            }
        }
    }
}

class SettingsGetCommand implements yargs.CommandModule {
    command = 'get';
    describe = 'Get settings.';

    builder(args: yargs.Argv) {
        return args
            .option('local', {
                alias: 'l',
                describe: 'Get local settings',
                type: 'boolean',
            })
            .option('key', {
                alias: 'k',
                describe: 'Key to get',
                demandOption: true,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { local, key } = args as unknown as { local?: boolean; key: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Local settings
        if (local) {
            const localSettings = gitsecrets.getLocalSettings();
            if (!localSettings) {
                Toast.warning(`No local settings file found. Get started with the '${CMD} settings set' command`);
                return;
            }
            Toast.success('***** Local Settings *****\n\n');
            console.log(`${key}: ${lodash.get(localSettings, key)}`);
            return;
        }
    }
}

class SettingsSetCommand implements yargs.CommandModule {
    command = 'set';
    describe = 'Set any setting locally.';

    builder(args: yargs.Argv) {
        return args
            .option('local', {
                alias: 'l',
                describe: 'Modify local settings',
                type: 'boolean',
            })
            .option('key', {
                alias: 'k',
                describe: 'Key to modify',
                demandOption: true,
                type: 'string',
            })
            .option('data', {
                alias: 'd',
                describe: 'Value to store under that key',
                demandOption: true,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { local, key, data } = args as unknown as { local?: boolean; key: string; data: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Modify settings
        if (local) {
            const localSettings = gitsecrets.getLocalSettings() || {};
            lodash.set(localSettings, key, data);
            fs.writeFileSync(gitsecrets.fs.files.localSettings, JSON.stringify(localSettings, null, 4), 'utf-8');
            return;
        }

        // Global settings
        Toast.warning('Not yet implemented');
    }
}

export class SettingsCommands implements yargs.CommandModule {
    command = 'settings <action>';
    describe = 'Commands to get or set settings.';

    builder(args: yargs.Argv) {
        return args
            .command(new SettingsGetCommand())
            .command(new SettingsSetCommand())
            .demandCommand(1, 'You need to specify an action (get, set)');
    }

    async handler(args: yargs.Arguments) {}
}

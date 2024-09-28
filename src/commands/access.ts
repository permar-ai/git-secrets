/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as yargs from 'yargs';

import { getGitSecrets } from '@/index';
import { Toast } from './utils';

class AccessAddCommand implements yargs.CommandModule {
    command = 'add';
    describe = 'Add access to file(s).';

    builder(args: yargs.Argv) {
        return args
            .option('file', {
                alias: 'f',
                describe: 'File path (flag can be used multiple times)',
                demandOption: true,
                type: 'array',
            })
            .option('user', {
                alias: 'u',
                describe: "User's email address (flag can be used multiple times)",
                demandOption: false,
                type: 'array',
            })
            .option('team', {
                alias: 't',
                describe: 'Team name (flag can be used multiple times)',
                demandOption: false,
                type: 'array',
            });
    }

    async handler(args: yargs.Arguments) {
        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // TODO: Implement method
        Toast.error('Method not yet implemented');
    }
}

class AccessRemoveCommand implements yargs.CommandModule {
    command = 'remove';
    describe = 'Remove access to file(s).';

    builder(args: yargs.Argv) {
        return args
            .option('file', {
                alias: 'f',
                describe: 'File path (flag can be used multiple times)',
                demandOption: true,
                type: 'array',
            })
            .option('user', {
                alias: 'u',
                describe: "User's email address (flag can be used multiple times)",
                demandOption: false,
                type: 'array',
            })
            .option('team', {
                alias: 't',
                describe: 'Team name (flag can be used multiple times)',
                demandOption: false,
                type: 'array',
            });
    }

    async handler(args: yargs.Arguments) {
        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // TODO: Implement method
        Toast.error('Method not yet implemented');
    }
}

export class AccessCommands implements yargs.CommandModule {
    command = 'access <action>';
    describe = 'Commands to add, update and remove teams.';

    builder(args: yargs.Argv) {
        return args
            .command(new AccessAddCommand())
            .command(new AccessRemoveCommand())
            .demandCommand(1, 'You need to specify an action (add, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

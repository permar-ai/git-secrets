/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as yargs from 'yargs';

import { getGitSecrets } from '@/index';

import { CMD } from './constants';
import { Toast, printResponse } from './utils';

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
        // Init
        const { file, user, team } = args as unknown as { file: string[]; user?: string[]; team?: string[] };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Execute
        const response = await gitsecrets.addFileAccess({ files: file, users: user, teams: team });
        printResponse({
            response: response,
            success: `Successfully added access to files.`,
            cmd: `Try using '${CMD} file list' to list files, '${CMD} user list' to list users or '${CMD} team list to list teams.`,
        });
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
        const { file, user, team } = args as unknown as { file: string[]; user?: string[]; team?: string[] };
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

/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as yargs from 'yargs';

import { getGitSecrets } from '@/index';
import { Git } from '@/git';
import { Toast } from '@/utils';

import { CMD } from './constants';
import { Markdown, printResponse } from './utils';

const git = new Git();

class AccessListCommand implements yargs.CommandModule {
    command = 'list';
    describe = 'List access to file(s).';

    builder(args: yargs.Argv) {
        return args
            .option('file', {
                alias: 'f',
                describe: 'File path',
                demandOption: false,
                type: 'string',
            })
            .option('user', {
                alias: 'u',
                describe: "User's email address (flag can be used multiple times)",
                demandOption: false,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { file, user } = args as unknown as { file?: string; user?: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Retrieve IDs
        let filePath;
        let userEmail;
        if (file) {
            const relativePath = git.getRelativePath(file as string);
            const fileObj = gitsecrets.files.getByPath(relativePath);
            if (fileObj) filePath = fileObj.path;
        }
        if (user) {
            const userObj = gitsecrets.users.getByEmail(user as string);
            if (userObj) userEmail = userObj.email;
        }

        // List
        const items = gitsecrets.access.fileAccess.findAll({ path: filePath, email: userEmail });
        const table = Markdown.table(items, ['access_type', 'file', 'user', 'team', 'collection']);
        console.log(`***** File Access *****\n\n${table}`);
    }
}

class AccessAddCommand implements yargs.CommandModule {
    command = 'add';
    describe = 'Add access to file(s).';

    builder(args: yargs.Argv) {
        return args
            .option('file', {
                alias: 'f',
                describe: 'File path (flag can be used multiple times)',
                demandOption: false,
                type: 'array',
            })
            .option('collection', {
                alias: 'c',
                describe: 'Collection name (flag can be used multiple times)',
                demandOption: false,
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
        const { file, collection, user, team } = args as unknown as {
            file?: string[];
            collection?: string[];
            user?: string[];
            team?: string[];
        };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Execute
        const response = await gitsecrets.addAccess({ files: file, collections: collection, users: user, teams: team });
        printResponse({
            response: response,
            success: `Successfully added access to files / collections.`,
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
                demandOption: false,
                type: 'array',
            })
            .option('collection', {
                alias: 'c',
                describe: 'Collection name (flag can be used multiple times)',
                demandOption: false,
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
        const { file, collection, user, team } = args as unknown as {
            file?: string[];
            collection?: string[];
            user?: string[];
            team?: string[];
        };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Execute
        const response = await gitsecrets.removeAccess({
            files: file,
            collections: collection,
            users: user,
            teams: team,
        });
        printResponse({
            response: response,
            success: `Successfully removed access to files / collections.`,
            cmd: `Try using '${CMD} file list' to list files, '${CMD} user list' to list users or '${CMD} team list to list teams.`,
        });
    }
}

export class AccessCommands implements yargs.CommandModule {
    command = 'access <action>';
    describe = 'Commands to list, add, and remove access to files.';

    builder(args: yargs.Argv) {
        return args
            .command(new AccessListCommand())
            .command(new AccessAddCommand())
            .command(new AccessRemoveCommand())
            .demandCommand(1, 'You need to specify an action (list, add, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

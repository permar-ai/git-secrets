/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as yargs from 'yargs';

import { getGitSecrets } from '@/index';
import { Toast } from '@/utils';

import { CMD } from './constants';
import { Markdown, printResponse } from './utils';

class TeamUserListCommand implements yargs.CommandModule {
    command = 'list';
    describe = 'List team users.';

    builder(args: yargs.Argv) {
        return args
            .option('team', {
                alias: 't',
                describe: 'Team name',
                demandOption: true,
                type: 'string',
            })
            .option('search', {
                alias: 's',
                describe: 'Search string',
                demandOption: false,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        let { team, search } = args as unknown as { team: string; search?: string };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // List teams
        let users = gitsecrets.teamUsersView.findAllUsers({ team: team });
        if (search) {
            const searchStr = search.toLowerCase();
            users = users.filter((u) => u.email.toLowerCase().includes(searchStr));
        }

        // Check any teams have been found
        if (users.length === 0) {
            Toast.warning(`No users found for team '${team}'` + (search ? ` with search query '${search}'.` : '.'));
            return;
        }
        const table = Markdown.table(users, ['team', 'user']);
        console.log(`***** Teams Users *****\n- Team: ${team}\n\n${table}`);
    }
}

class TeamUserAddCommand implements yargs.CommandModule {
    command = 'add';
    describe = 'Add user(s) to team(s).';

    builder(args: yargs.Argv) {
        return args
            .option('team', {
                alias: 't',
                describe: 'Team name (flag can be used multiple times)',
                demandOption: true,
                type: 'array',
            })
            .option('user', {
                alias: 'u',
                describe: "User's email address (flag can be used multiple times)",
                demandOption: true,
                type: 'array',
            });
    }

    async handler(args: yargs.Arguments) {
        const { team, user } = args as unknown as { team: string[]; user: string[] };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Exec
        const response = await gitsecrets.addTeamUsers({ teams: team, users: user });
        printResponse({
            response: response,
            success: 'Successfully added users to teams.',
            cmd: `Try using '${CMD} team list' to list teams or '${CMD} user list' to list users`,
        });
    }
}

class TeamUserRemoveCommand implements yargs.CommandModule {
    command = 'remove';
    describe = 'Remove user(s) from team(s).';

    builder(args: yargs.Argv) {
        return args
            .option('team', {
                alias: 't',
                describe: 'Team name (flag can be used multiple times)',
                demandOption: false,
                type: 'array',
            })
            .option('user', {
                alias: 'u',
                describe: "User's email address (flag can be used multiple times)",
                demandOption: false,
                type: 'array',
            });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { team, user } = args as unknown as { team: string[]; user: string[] };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Exec
        const response = await gitsecrets.removeTeamUsers({ teams: team, users: user });
        printResponse({
            response: response,
            success: 'Successfully removed users from teams.',
            cmd: `Try using '${CMD} team list' to list teams or '${CMD} user list' to list users`,
        });
    }
}

export class TeamUserCommands implements yargs.CommandModule {
    command = 'user <action>';
    describe = 'Commands to list, add and remove team users.';

    builder(args: yargs.Argv) {
        return args
            .command(new TeamUserListCommand())
            .command(new TeamUserAddCommand())
            .command(new TeamUserRemoveCommand())
            .demandCommand(1, 'You need to specify an action (list, add, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

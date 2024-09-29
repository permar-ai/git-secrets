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
import { TeamMemberCommands } from './teamMembers';
import { Toast, Markdown, printResponse } from './utils';

class TeamListCommand implements yargs.CommandModule {
    command = 'list';
    describe = 'List teams.';

    builder(args: yargs.Argv) {
        return args.option('search', {
            alias: 's',
            describe: 'Search string',
            demandOption: false,
            type: 'string',
        });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { search } = args as unknown as { search?: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // List teams
        let teams = gitsecrets.teams.findAll();
        if (search) {
            const searchStr = search.toLowerCase();
            teams = teams.filter(
                (team) =>
                    team.name.toLowerCase().includes(searchStr) || team.description?.toLowerCase().includes(searchStr),
            );
        }

        // Check any teams have been found
        if (teams.length === 0) {
            Toast.warning('No teams found' + (search ? ` with search query '${search}'.` : '.'));
            return;
        }
        const table = Markdown.table(teams, ['name', 'description']);
        console.log(`***** Teams *****\n\n${table}`);
    }
}

class TeamAddCommand implements yargs.CommandModule {
    command = 'add';
    describe = 'Add a new team.';

    builder(args: yargs.Argv) {
        return args
            .option('name', {
                alias: 'n',
                describe: 'Team name',
                demandOption: true,
                type: 'string',
            })
            .option('description', {
                alias: 'd',
                describe: 'Team description',
                demandOption: false,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { name, description } = args as unknown as { name: string; description?: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Add user
        const response = await gitsecrets.addTeam({ name: name, description: description });
        printResponse({
            response: response,
            success:
                `Successfully added team with name: '${name}'` +
                (description ? ` and description: '${description}'.` : '.'),
            cmd: `Try using '${CMD} team list' to list teams.`,
        });
    }
}

class TeamUpdateCommand implements yargs.CommandModule {
    command = 'update';
    describe = 'Update team information.';

    builder(args: yargs.Argv) {
        return args
            .option('name', {
                alias: 'n',
                describe: 'Team name',
                demandOption: true,
                type: 'string',
            })
            .option('updated-name', {
                alias: 'u',
                describe: 'Updated team name',
                demandOption: false,
                type: 'string',
            })
            .option('description', {
                alias: 'd',
                describe: 'Updated team description',
                demandOption: false,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { name, updatedName, description } = args as unknown as {
            name: string;
            updatedName?: string;
            description?: string;
        };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Update team
        const team = gitsecrets.teams.getByName(name);
        if (!team) {
            Toast.warning(`No team with name '${name}' found.\nTry '${CMD} team list' to list teams.`);
            return;
        }
        gitsecrets.teams.update(team.id, { name: updatedName, description: description });
        Toast.success(`Successfully updated team.`);
    }
}

class TeamRemoveCommand implements yargs.CommandModule {
    command = 'remove';
    describe = 'Remove team.';

    builder(args: yargs.Argv) {
        return args.option('name', {
            alias: 'n',
            describe: 'Team name',
            demandOption: true,
            type: 'string',
        });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { name } = args as unknown as { name: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        const team = gitsecrets.teams.getByName(name);
        if (!team) {
            Toast.warning(`No team with name '${name}' found.\nTry '${CMD} team list' to list teams.`);
            return;
        }
        gitsecrets.teams.remove(team.id);
        Toast.success(`Successfully removed team '${team.name}'.`);
    }
}

export class TeamCommands implements yargs.CommandModule {
    command = 'team <action>';
    describe = 'Commands to add, update and remove teams.';

    builder(args: yargs.Argv) {
        return args
            .command(new TeamListCommand())
            .command(new TeamAddCommand())
            .command(new TeamUpdateCommand())
            .command(new TeamRemoveCommand())
            .command(new TeamMemberCommands())
            .demandCommand(1, 'You need to specify an action (add, update, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

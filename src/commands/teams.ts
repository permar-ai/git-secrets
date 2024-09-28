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
        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Add user
        const { name, description } = args;
        await gitsecrets.addTeam({
            name: name as string,
            description: description as string,
        });
        Toast.success(`Added team with name: '${name}'` + (description ? ` and description: '${description}.` : '.'));
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
        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // TODO: Implement method
        Toast.error('Method not yet implemented');
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
        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // TODO: Implement method
        Toast.error('Method not yet implemented');
    }
}

export class TeamCommands implements yargs.CommandModule {
    command = 'team <action>';
    describe = 'Commands to add, update and remove teams.';

    builder(args: yargs.Argv) {
        return args
            .command(new TeamAddCommand())
            .command(new TeamUpdateCommand())
            .command(new TeamRemoveCommand())
            .demandCommand(1, 'You need to specify an action (add, update, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

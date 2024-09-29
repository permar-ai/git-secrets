/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as yargs from 'yargs';
import { prompt } from 'enquirer';

import { getGitSecrets } from '@/index';
import { Toast } from '@/utils';

import { CMD } from './constants';
import { Markdown, printResponse } from './utils';

class UserListCommand implements yargs.CommandModule {
    command = 'list';
    describe = 'List users.';

    builder(args: yargs.Argv) {
        return args.option('search', {
            alias: 's',
            describe: 'Search string',
            demandOption: false,
            type: 'string',
        });
    }

    async handler(args: yargs.Arguments) {
        const { search } = args as unknown as { search?: string };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // List teams
        let users = gitsecrets.users.findAll();
        if (search) {
            const searchStr = search.toLowerCase();
            users = users.filter(
                (team) => team.email.toLowerCase().includes(searchStr) || team.name?.toLowerCase().includes(searchStr),
            );
        }

        // Check any users have been found
        if (users.length === 0) {
            Toast.warning('No users found' + (search ? ` with search query '${search}'.` : '.'));
            return;
        }
        const table = Markdown.table(users, ['email', 'name']);
        console.log(`***** Users *****\n\n${table}`);
    }
}

class UserAddCommand implements yargs.CommandModule {
    command = 'add';
    describe = 'Add new user.';

    builder(args: yargs.Argv) {
        return args
            .option('email', {
                alias: 'e',
                describe: "User's email address",
                demandOption: true,
                type: 'string',
            })
            .option('name', {
                alias: 'n',
                describe: 'User name',
                demandOption: false,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        const { email, name } = args as unknown as { email: string; name?: string };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Check if user exists
        const user = await gitsecrets.users.getByEmail(email);
        if (user) {
            Toast.warning(`User with email '${email}' already exist.\nTry using the '${CMD} user update' command.`);
            return;
        }

        // New user
        const answers = await prompt<{ password: string }>([
            {
                type: 'password',
                name: 'password',
                message: 'Enter your password (min. 16 characters):',
                validate(value) {
                    return value.length >= 16 ? true : 'Password must be at least 16 characters long';
                },
            },
        ]);

        // Create user
        const response = await gitsecrets.addUser({
            email: email,
            name: name,
            password: answers.password,
        });
        printResponse({
            response: response,
            success: `Successfully added user with email: '${email}'` + (name ? ` and name: '${name}'.` : '.'),
            cmd: `Try using '${CMD} user list' to list users.`,
        });
    }
}

class UserUpdateCommand implements yargs.CommandModule {
    command = 'update';
    describe = 'Update user information.';

    builder(args: yargs.Argv) {
        return args
            .option('email', {
                alias: 'e',
                describe: "User's email address",
                demandOption: true,
                type: 'string',
            })
            .option('updated-email', {
                alias: 'u',
                describe: "User's updated email address",
                demandOption: false,
                type: 'string',
            })
            .option('name', {
                alias: 'n',
                describe: 'New user name',
                demandOption: false,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        const { email, updatedEmail, name } = args as unknown as {
            email: string;
            updatedEmail?: string;
            name?: string;
        };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Update team
        const user = gitsecrets.users.getByEmail(email);
        if (!user) {
            Toast.warning(`No user with email '${email}' found.\nTry '${CMD} user list' to list users.`);
            return;
        }
        gitsecrets.users.update(user.id, { email: updatedEmail, name: name });
        Toast.success(`Successfully updated user.`);
    }
}

class UserRemoveCommand implements yargs.CommandModule {
    command = 'remove';
    describe = 'Remove user.';

    builder(args: yargs.Argv) {
        return args.option('email', {
            alias: 'e',
            describe: "User's email address",
            demandOption: true,
            type: 'string',
        });
    }

    async handler(args: yargs.Arguments) {
        const { email } = args as unknown as { email: string };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Remove user + keys
        const user = gitsecrets.users.getByEmail(email);
        if (!user) {
            Toast.warning(`No user with email '${email}' found.\nTry '${CMD} user list' to list users.`);
            return;
        }
        gitsecrets.users.remove(user.id);
        await gitsecrets.openpgp.removeUserKeys(user.id);
        Toast.success(`Successfully removed user '${user.email}'.`);
    }
}

export class UserCommands implements yargs.CommandModule {
    command = 'user <action>';
    describe = 'Commands to add, update and remove users.';

    builder(args: yargs.Argv) {
        return args
            .command(new UserListCommand())
            .command(new UserAddCommand())
            .command(new UserUpdateCommand())
            .command(new UserRemoveCommand())
            .demandCommand(1, 'You need to specify an action (add, update, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

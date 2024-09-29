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

class CollectionListCommand implements yargs.CommandModule {
    command = 'list';
    describe = 'List collections.';

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
        let collections = gitsecrets.collections.findAll();
        if (search) {
            const searchStr = search.toLowerCase();
            collections = collections.filter(
                (c) => c.name.toLowerCase().includes(searchStr) || c.description?.toLowerCase().includes(searchStr),
            );
        }

        // Check any collections have been found
        if (collections.length === 0) {
            Toast.warning('No collections found' + (search ? ` with search query '${search}'.` : '.'));
            return;
        }
        const table = Markdown.table(collections, ['name', 'description']);
        console.log(`***** Collections *****\n\n${table}`);
    }
}

class CollectionAddCommand implements yargs.CommandModule {
    command = 'add';
    describe = 'Add a new collection.';

    builder(args: yargs.Argv) {
        return args
            .option('name', {
                alias: 'n',
                describe: 'Collection name',
                demandOption: true,
                type: 'string',
            })
            .option('description', {
                alias: 'd',
                describe: 'Collection description',
                demandOption: false,
                type: 'string',
            });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { name, description } = args as unknown as { name: string; description?: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Add collection
        const response = await gitsecrets.addCollection({ name: name, description: description });
        printResponse({
            response: response,
            success: `Successfully registered collection with name '${name}'.`,
            cmd: `Try using '${CMD} collection list' to list collections.`,
        });
    }
}

class CollectionUpdateCommand implements yargs.CommandModule {
    command = 'update';
    describe = 'Update collection information.';

    builder(args: yargs.Argv) {
        return args
            .option('name', {
                alias: 'n',
                describe: 'Current collection name',
                demandOption: true,
                type: 'string',
            })
            .option('updated-name', {
                alias: 'u',
                describe: 'Updated collection name',
                demandOption: false,
                type: 'string',
            })
            .option('description', {
                alias: 'd',
                describe: 'Updated description',
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

        // Update collection
        const collection = gitsecrets.collections.getByName(name);
        if (!collection) {
            Toast.warning(
                `No collection with name '${name}' found.\nTry 'git-secrets collection list' to list collections.`,
            );
            return;
        }

        // Update collection
        gitsecrets.collections.update(collection.id, { name: updatedName, description: description });
        Toast.success('Successfully update collection.');
    }
}

class CollectionRemoveCommand implements yargs.CommandModule {
    command = 'remove';
    describe = 'Remove collection.';

    builder(args: yargs.Argv) {
        return args.option('name', {
            alias: 'n',
            describe: 'Collection name',
            demandOption: true,
            type: 'string',
        });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { name } = args as unknown as { name: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Remove collection
        const collection = gitsecrets.collections.getByName(name);
        if (!collection) {
            Toast.warning(
                `No collection with name '${name}' found.\nTry 'git-secrets collection list' to list collections.`,
            );
            return;
        }
        gitsecrets.collections.remove(collection.id);
        Toast.success('Successfully removed collection.');
    }
}

export class CollectionCommands implements yargs.CommandModule {
    command = 'collection <action>';
    describe = 'Commands to list, add, update and remove collections.';

    builder(args: yargs.Argv) {
        return args
            .command(new CollectionListCommand())
            .command(new CollectionAddCommand())
            .command(new CollectionUpdateCommand())
            .command(new CollectionRemoveCommand())
            .demandCommand(1, 'You need to specify an action (list, add, update, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

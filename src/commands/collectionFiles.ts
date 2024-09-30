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

class CollectionFileListCommand implements yargs.CommandModule {
    command = 'list';
    describe = 'List collection files.';

    builder(args: yargs.Argv) {
        return args
            .option('collection', {
                alias: 'c',
                describe: 'Collection name',
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
        // Init
        let { collection, search } = args as unknown as { collection: string; search?: string };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // List collections
        let collectionFiles = gitsecrets.collectionFilesView.findAllFiles({ collection });
        if (search) {
            const searchStr = search.toLowerCase();
            collectionFiles = collectionFiles.filter(
                (cf) => cf.collection.toLowerCase().includes(searchStr) || cf.file.toLowerCase().includes(searchStr),
            );
        }

        // Check any collections have been found
        if (collectionFiles.length === 0) {
            Toast.warning(
                `No files found for collection '${collection}'` + (search ? ` with search query '${search}'.` : '.'),
            );
            return;
        }
        const table = Markdown.table(collectionFiles, ['collection', 'file']);
        console.log(`***** Collection Files *****\n- Collection: ${collection}\n\n${table}`);
    }
}

class CollectionFileAddCommand implements yargs.CommandModule {
    command = 'add';
    describe = 'Add file(s) to collection(s).';

    builder(args: yargs.Argv) {
        return args
            .option('collection', {
                alias: 'c',
                describe: 'Collection name (flag can be used multiple times)',
                demandOption: true,
                type: 'array',
            })
            .option('file', {
                alias: 'f',
                describe: "File's path (flag can be used multiple times)",
                demandOption: true,
                type: 'array',
            });
    }

    async handler(args: yargs.Arguments) {
        const { collection, file } = args as unknown as { collection: string[]; file: string[] };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Exec
        const response = await gitsecrets.addCollectionFiles({ collections: collection, files: file });
        printResponse({
            response: response,
            success: 'Successfully added files to collections.',
            cmd: `Try using '${CMD} collection list' to list collections or '${CMD} file list' to list files.`,
        });
    }
}

class CollectionFileRemoveCommand implements yargs.CommandModule {
    command = 'remove';
    describe = 'Remove files(s) from collections(s).';

    builder(args: yargs.Argv) {
        return args
            .option('collection', {
                alias: 'c',
                describe: 'Collection name (flag can be used multiple times)',
                demandOption: false,
                type: 'array',
            })
            .option('file', {
                alias: 'f',
                describe: "File's path (flag can be used multiple times)",
                demandOption: false,
                type: 'array',
            });
    }

    async handler(args: yargs.Arguments) {
        // Init
        const { collection, file } = args as unknown as { collection: string[]; file: string[] };
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Exec
        const response = await gitsecrets.removeCollectionFiles({ collections: collection, files: file });
        printResponse({
            response: response,
            success: 'Successfully removed files from collections.',
            cmd: `Try using '${CMD} collection list' to list collections or '${CMD} file list' to list files`,
        });
    }
}

export class CollectionFileCommands implements yargs.CommandModule {
    command = 'file <action>';
    describe = 'Commands to list, add and remove collection files.';

    builder(args: yargs.Argv) {
        return args
            .command(new CollectionFileListCommand())
            .command(new CollectionFileAddCommand())
            .command(new CollectionFileRemoveCommand())
            .demandCommand(1, 'You need to specify an action (list, add, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

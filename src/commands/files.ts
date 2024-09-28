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
import { Markdown, Toast } from './utils';

class FileListCommand implements yargs.CommandModule {
    command = 'list';
    describe = 'List files.';

    builder(args: yargs.Argv) {
        return args.option('search', {
            alias: 's',
            describe: 'Search string',
            demandOption: false,
            type: 'string',
        });
    }

    async handler(args: yargs.Arguments) {
        let { search } = args;

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // List teams
        let files = gitsecrets.files.findAll();
        if (typeof search === 'string') {
            const searchStr = search.toLowerCase();
            files = files.filter((file) => file.path.toLowerCase().includes(searchStr));
        }

        // Check any users have been found
        if (files.length === 0) {
            Toast.warning('No files found' + (search ? ` with search query '${search}'.` : '.'));
            return;
        }
        const table = Markdown.table(files, ['path']);
        console.log(`***** Files *****\n\n${table}`);
    }
}

class FileAddCommand implements yargs.CommandModule {
    command = 'add';
    describe = 'Add a new file.';

    builder(args: yargs.Argv) {
        return args.option('path', {
            alias: 'p',
            describe: 'Path of the file',
            demandOption: true,
            type: 'string',
        });
    }

    async handler(args: yargs.Arguments) {
        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Compute file path relative to git directory
        const git = new Git();
        const relativePath = git.getRelativePath(args.path as string);

        // Add file
        await gitsecrets.addFile(relativePath);
        Toast.success(`Successfully registered file with path '${relativePath}'.`);
    }
}

class FileUpdateCommand implements yargs.CommandModule {
    command = 'update';
    describe = 'Update file information.';

    builder(args: yargs.Argv) {
        return args
            .option('path', {
                alias: 'p',
                describe: 'Current file path',
                demandOption: true,
                type: 'string',
            })
            .option('updated-path', {
                alias: 'u',
                describe: 'Updated file path',
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

class FileRemoveCommand implements yargs.CommandModule {
    command = 'remove';
    describe = 'Remove file.';

    builder(args: yargs.Argv) {
        return args.option('path', {
            alias: 'p',
            describe: 'File path',
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

export class FileCommands implements yargs.CommandModule {
    command = 'file <action>';
    describe = 'Commands to add, update and remove files.';

    builder(args: yargs.Argv) {
        return args
            .command(new FileListCommand())
            .command(new FileAddCommand())
            .command(new FileUpdateCommand())
            .command(new FileRemoveCommand())
            .demandCommand(1, 'You need to specify an action (add, update, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

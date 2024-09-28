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
import { Toast } from './utils';

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
            .command(new FileAddCommand())
            .command(new FileUpdateCommand())
            .command(new FileRemoveCommand())
            .demandCommand(1, 'You need to specify an action (add, update, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

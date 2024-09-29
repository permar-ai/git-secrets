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

import { CMD } from './constants';
import { Markdown, Toast, printResponse } from './utils';

const git = new Git();

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
        const { search } = args as unknown as { search?: string };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // List teams
        let files = gitsecrets.files.findAll();
        if (search) {
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
        const { path } = args as unknown as { path: string };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Add file
        const relativePath = git.getRelativePath(path);
        const response = await gitsecrets.addFile(relativePath);
        printResponse({
            response: response,
            success: `Successfully registered file with path '${relativePath}'.`,
            cmd: `Try using '${CMD} file list' to list files.`,
        });
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
        const { path, updatedPath } = args as unknown as { path: string; updatedPath: string };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        const relativePath = git.getRelativePath(path);
        const relativeUpdatedPath = git.getRelativePath(updatedPath);

        // Update file
        const file = gitsecrets.files.getByPath(relativePath);
        if (!file) {
            Toast.warning(`No file with path '${relativePath}' found.\nTry 'git-secrets file list' to list files.`);
            return;
        }

        // Get new signatures
        const contentsSignature = gitsecrets.fs.getSignature(relativeUpdatedPath);
        const accessSignature = gitsecrets.access.getSignature(file.id);
        gitsecrets.files.update(file.id, { path: relativeUpdatedPath, contentsSignature, accessSignature });
        Toast.success('Successfully update file.');
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
        const { path } = args as unknown as { path: string };

        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // Remove path
        const relativePath = git.getRelativePath(path);
        const file = gitsecrets.files.getByPath(relativePath);
        if (!file) {
            Toast.warning(`No file with path '${relativePath}' found.\nTry 'git-secrets file list' to list files.`);
            return;
        }
        gitsecrets.files.remove(file.id);
        Toast.success('Successfully removed file.');
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

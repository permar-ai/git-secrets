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

export class HideCommand implements yargs.CommandModule {
    command = 'hide';
    describe = 'Encrypt all files that the user has access to.';

    builder(args: yargs.Argv) {
        return args
            .option('modified', {
                alias: 'm',
                describe: 'Hide only modified files',
                type: 'boolean',
            })
            .option('file', {
                alias: 'f',
                describe: 'Path to a file to hide (flag can be used multiple times)',
                type: 'array',
            });
    }

    async handler(args: yargs.Arguments) {
        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // TODO: cannot use git, because files are not staged as they are ignore -> Need to do this with files signatures.

        // TODO: Implement method
        Toast.error('Method not yet implemented');
    }
}

export class ShowCommand implements yargs.CommandModule {
    command = 'show';
    describe = 'Decrypt all files that user has access to.';

    builder(args: yargs.Argv) {
        return args.option('file', {
            alias: 'f',
            describe: 'Path to a file to show (flag can be used multiple times)',
            type: 'array',
        });
    }

    async handler(args: yargs.Arguments) {
        // Client
        const gitsecrets = getGitSecrets();
        if (!gitsecrets) return;

        // TODO: cannot use git, because files are not staged as they are ignore -> Need to do this with files signatures.

        // TODO: Implement method
        Toast.error('Method not yet implemented');
    }
}

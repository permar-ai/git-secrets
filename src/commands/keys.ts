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

class UserKeysUpdateCommand implements yargs.CommandModule {
    command = 'keys';
    describe = 'Update the user public and private keys.';

    builder(args: yargs.Argv) {
        return args.option('email', {
            alias: 'e',
            describe: "User's email address",
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

export class KeysCommands implements yargs.CommandModule {
    command = 'keys <action>';
    describe = "Commands to update and remove users' keys.";

    builder(args: yargs.Argv) {
        return args
            .command(new UserKeysUpdateCommand())
            .demandCommand(1, 'You need to specify an action (update, remove)');
    }

    async handler(args: yargs.Arguments) {}
}

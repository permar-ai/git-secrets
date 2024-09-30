/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as yargs from 'yargs';

import { SetupManager } from '@/setup';
import { Toast } from '@/utils';

import { CMD } from './constants';

export class InitCommand implements yargs.CommandModule {
    command = 'init';
    describe = `Initialize ${CMD}.`;

    builder(args: yargs.Argv) {
        return args;
    }

    async handler(args: yargs.Arguments) {
        // Setup
        const setupManager = new SetupManager();
        setupManager.directories();
        setupManager.files();
        setupManager.database();
        Toast.success(`Successfully initialized ${CMD}.`);
    }
}

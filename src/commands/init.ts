/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as yargs from 'yargs';
import chalk from 'chalk';

import { Git } from '@/git';
import { SetupManager } from '@/managers';

const git = new Git();

export class InitCommand implements yargs.CommandModule {
    command = 'init';
    describe = 'Initialize git-secrets.';

    builder(args: yargs.Argv) {
        return args;
    }

    async handler(args: yargs.Arguments) {
        // Directory
        const repoDir = git.getRepositoryRootDir();

        // Setup
        const setupManager = new SetupManager({ repoDir: repoDir });
        setupManager.directories();
        setupManager.files();
        setupManager.database();
        console.log(chalk.green(`Successfully initialized git-secrets.`));
    }
}

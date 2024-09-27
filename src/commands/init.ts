/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as yargs from 'yargs';
import * as chalk from 'chalk';

/**
 * Init git-secret command
 */
export class InitCommand implements yargs.CommandModule {
    command = "init"
    describe = "Initializes a git-secrets repository at the directory passed in."

    builder(args: yargs.Argv) {
        return args.option("file", {
            alias: "f",
            describe: "Path to the file where your DataSource instance is defined.",
            demandOption: true,
        })
    }

    async handler(args: yargs.Arguments) {
        console.log(args);
        console.log(chalk.green('Initialized'));
    }
}
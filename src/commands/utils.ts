/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import chalk from "chalk";

export class Toast {
    static success(message: string) {
        console.log(chalk.green(message));
    }

    static warning(message: string) {
        console.log(chalk.yellow(message));
    }

    static error(message: string) {
        console.log(chalk.red(message));
    }
}

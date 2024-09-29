/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import chalk from 'chalk';

import { InternalFileSystem } from './io';
import { GitSecretsManager as GitSecrets } from './managers';
import { CMD } from './commands/constants';

export function getGitSecrets() {
    // Initialization check
    const fs = new InternalFileSystem();
    if (!fs.isInitialized()) {
        console.log(chalk.yellow(`Please run '${CMD} init' to get started.`));
        return;
    }

    // Manager instantiation
    return new GitSecrets();
}

export { GitSecrets };

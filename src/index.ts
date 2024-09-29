/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import chalk from 'chalk';

import { Git } from './git';
import { InternalFileSystem } from './io';
import { GitSecretsManager as GitSecrets } from './managers';

const git = new Git();

export function getGitSecrets() {
    // Directory
    const repoDir = git.getRepositoryRootDir();

    // Initialization check
    const fs = new InternalFileSystem({ repoDir: repoDir });
    if (!fs.isInitialized()) {
        console.log(chalk.yellow("Please run 'git-secrets init' to get started."));
        return;
    }

    // Manager instantiation
    return new GitSecrets({ repoDir: repoDir });
}

export { GitSecrets };

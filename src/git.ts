/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */


/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as path from 'path';

import { execSync } from 'child_process';

export class Git {
    constructor() {
    }

    executeCmd(command: string, defaultValue: any = null) {
        try {
            const output = execSync(command, { stdio: 'pipe' }).toString();
            if (output.toLowerCase().includes('error')) return defaultValue;
            return output.toString().split('\n').filter(Boolean);
        } catch (err) {
            return defaultValue;
        }
    }

    getRepositoryRootDir() {
        const command = 'git rev-parse --show-toplevel';
        const response = this.executeCmd(command, []);
        if (response.length === 1) return response[0];
        throw new Error('Initialize a git repository first')
    }

    getRelativePath(filepath: string) {
        const repoDir = this.getRepositoryRootDir();
        const pwd = process.cwd();
        const absolutePath = path.resolve(pwd, filepath);
        return path.relative(repoDir, absolutePath);
    }

    listStagedFiles(extension?: string): string[] {
        const extensionFilter = extension ? `-- '***.${extension}'` : '';
        const command = `git diff --cached --name-only ${extensionFilter}`;
        return this.executeCmd(command, []);
    }

    listUnstagedFiles(extension?: string): string[] {
        const extensionFilter = extension ? `-- '*.${extension}'` : '';
        const command = `git diff --name-only ${extensionFilter}`;
        return this.executeCmd(command, []);
    }

    isFileStaged(filename: string): boolean {
        const command = `git diff --cached --name-only ${filename}`;
        const files = this.executeCmd(command, []);
        return files.length === 1;
    }

    isFileUnstaged(filename: string): boolean {
        const command = `git diff --name-only ${filename}`;
        const files = this.executeCmd(command, []);
        return files.length === 1;
    }

    listChangedFiles({ extension, stagedOnly = false }: { extension?: string, stagedOnly: boolean } ): string[] {
        const files = this.listStagedFiles(extension);
        if (stagedOnly) return files;
        files.push(...this.listUnstagedFiles(extension));
        return files;
    }

    hasFileChanged(filename: string, stagedOnly: boolean = false): boolean {
        const stagedChange = this.isFileStaged(filename);
        if (stagedOnly) return stagedChange;
        const unstagedChange = this.isFileUnstaged(filename);
        return stagedChange || unstagedChange;
    }
}

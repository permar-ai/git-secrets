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

import * as fs from 'fs';
import * as path from 'path';

import { execSync } from 'child_process';

const GITSECRETS_COMMENT_REGEX = /^#\s*git-secrets\s*$/;
const EMPTY_LINE_REGEX = /^\s?$/;

export class Git {
    constructor() {}

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
        throw new Error('Initialize a git repository first');
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

    listChangedFiles({ extension, stagedOnly = false }: { extension?: string; stagedOnly: boolean }): string[] {
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

    addToGitIgnore(filepath: string) {
        const repoDir = this.getRepositoryRootDir();
        const relativePath = this.getRelativePath(filepath);
        const gitignore = path.resolve(repoDir, '.gitignore');
        if (!fs.existsSync(gitignore)) fs.writeFileSync(gitignore, '', 'utf-8');

        // Retrieve git-secrets block
        const lines = fs.readFileSync(gitignore, 'utf-8').split('\n');
        const { before, gitSecrets, after } = this.parseGitignore(lines);

        // Append file if not in list
        // TODO: Add support for existing directory ignores
        const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const filepathRegex = new RegExp(`^\\.?\\/?.*${escapedPath}\\s*(#.*)?$`);
        if (!gitSecrets.some((entry) => filepathRegex.test(entry))) {
            gitSecrets.push(relativePath);
        }

        // Write file
        const gitIgnoreOut = [...before, gitSecrets[0], ...gitSecrets.slice(1).sort(), ...after].join('\n');
        fs.writeFileSync(gitignore, gitIgnoreOut, 'utf-8');
    }

    removeFromGitIgnore(filepath: string) {
        const repoDir = this.getRepositoryRootDir();
        const relativePath = this.getRelativePath(filepath);
        const gitignore = path.resolve(repoDir, relativePath);
        if (!fs.existsSync(gitignore)) return;

        // Retrieve git-secrets block
        const lines = fs.readFileSync(gitignore, 'utf-8').split('\n');
        const { before, gitSecrets, after } = this.parseGitignore(lines);

        // Remove file if in list
        const escapedPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const filepathRegex = new RegExp(`^\\.?\\/?.*${escapedPath}\\s*(#.*)?$`);
        const gitSecretsUpdated = gitSecrets.filter((entry) => !filepathRegex.test(entry));

        // Write file
        const gitIgnoreOut = [...before, ...gitSecretsUpdated, ...after].join('\n');
        fs.writeFileSync(gitignore, gitIgnoreOut, 'utf-8');
    }

    parseGitignore(lines: string[]) {
        // Identify line with '# git-secrets' comment and next empty line
        let start = null;
        let end = null;
        for (let i = 0; i < lines.length; i++) {
            if (GITSECRETS_COMMENT_REGEX.test(lines[i])) {
                start = i;
                for (let j = i + 1; j < lines.length; j++) {
                    if (EMPTY_LINE_REGEX.test(lines[j])) end = j;
                }
            }
        }

        // Block doesn't exist
        if (!start) start = lines.length;
        if (!end) end = lines.length;

        // Before
        let before = lines.slice(0, start);
        if (before.length && !EMPTY_LINE_REGEX.test(before.slice(-1)[0])) before.push('');

        // Block
        let block = lines.slice(start, end);
        if (block.length) {
            block = block.filter((x) => !EMPTY_LINE_REGEX.test(x));
        } else {
            block.push('# git-secrets');
        }

        // After
        let after = lines.slice(end, lines.length);
        if (!after.length) after.push('');
        if (after.length && !EMPTY_LINE_REGEX.test(after[0])) after.unshift('');
        if (after.length && !EMPTY_LINE_REGEX.test(after.slice(-1)[0])) after.push('');

        return {
            before: before,
            gitSecrets: block,
            after: after,
        };
    }
}

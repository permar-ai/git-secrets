/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as fs from 'fs';
import * as path from 'path';

import crypto from 'crypto';

import { Git } from './git';

// Directory and file names
const GIT_SECRETS_DIR = '.gitsecrets';
const DATA_DIR = 'data';
const KEYS_DIR = 'keys';
const DATA_SIGNATURES_FILENAME = 'signatures.json';
const SETTINGS_FILENAME = 'settings.json';
const LOCAL_SETTINGS_FILENAME = 'local.settings.json';
const DB_FILENAME = 'data.db';

type KeyPathFunction = (userId: string) => string;

const git = new Git();

export class InternalFileSystem {
    readonly dirs: { repo: string; gitsecrets: string; keys: string; data: string };
    readonly files: {
        settings: string;
        localSettings: string;
        db: string;
        dataSignatures: string;
        publicKey: KeyPathFunction;
        privateKey: KeyPathFunction;
    };

    constructor() {
        // Repository directory is by default the root of the git repository
        const repoDir = git.getRepositoryRootDir();
        this.dirs = {
            repo: repoDir,
            gitsecrets: path.resolve(repoDir, GIT_SECRETS_DIR),
            keys: path.resolve(repoDir, GIT_SECRETS_DIR, KEYS_DIR),
            data: path.resolve(repoDir, GIT_SECRETS_DIR, DATA_DIR),
        };

        const gs = this.dirs.gitsecrets;
        this.files = {
            settings: path.resolve(gs, SETTINGS_FILENAME),
            localSettings: path.resolve(gs, LOCAL_SETTINGS_FILENAME),
            db: path.resolve(gs, DB_FILENAME),
            dataSignatures: path.resolve(this.dirs.data, DATA_SIGNATURES_FILENAME),
            publicKey: (userId: string) => {
                return path.resolve(this.dirs.keys, `${userId}.public`);
            },
            privateKey: (userId: string) => {
                return path.resolve(this.dirs.keys, `${userId}.private`);
            },
        };
    }

    isInitialized(): boolean {
        if (!fs.existsSync(this.dirs.gitsecrets)) return false;
        if (!fs.existsSync(this.dirs.keys)) return false;
        if (!fs.existsSync(this.files.settings)) return false;
        if (!fs.existsSync(this.files.localSettings)) return false;
        if (!fs.existsSync(this.files.db)) return false;
        return true;
    }

    getSignature(relativePath: string): string {
        const absolutePath = path.resolve(this.dirs.repo, relativePath);
        const contents = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf-8') : '';
        return crypto.createHash('sha256').update(contents).digest('hex');
    }
}

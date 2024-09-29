/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as fs from 'fs';
import * as path from 'path';

import {
    DATA_DIR,
    DATA_SIGNATURES_FILENAME,
    DB_FILENAME,
    GIT_SECRETS_DIR,
    KEYS_DIR,
    LOCAL_SETTINGS_FILENAME,
} from '@/constants';
import crypto from 'crypto';

type KeyPathFunction = (userId: string) => string;

export class InternalFileSystem {
    readonly dirs: { repo: string; gitsecrets: string; keys: string; data: string };
    readonly files: {
        settings?: string;
        localSettings: string;
        db: string;
        dataSignatures: string;
        publicKey: KeyPathFunction;
        privateKey: KeyPathFunction;
    };

    constructor({ repoDir }: { repoDir: string }) {
        this.dirs = {
            repo: repoDir,
            gitsecrets: path.resolve(repoDir, GIT_SECRETS_DIR),
            keys: path.resolve(repoDir, GIT_SECRETS_DIR, KEYS_DIR),
            data: path.resolve(repoDir, GIT_SECRETS_DIR, DATA_DIR),
        };
        this.files = {
            localSettings: path.resolve(this.dirs.gitsecrets, LOCAL_SETTINGS_FILENAME),
            db: path.resolve(this.dirs.gitsecrets, DB_FILENAME),
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
        const initialized = false;
        if (!fs.existsSync(this.dirs.gitsecrets)) return initialized;
        if (!fs.existsSync(this.dirs.keys)) return false;
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

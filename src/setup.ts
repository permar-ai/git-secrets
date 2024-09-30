/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as fs from 'fs';
import * as path from 'path';

import Database from 'better-sqlite3';

import { GIT_IGNORE, SETTINGS, LOCAL_SETTINGS } from './constants';
import { InternalFileSystem } from './io';
import { mkdirIfNotExists, writeFileIfNotExists, runSQLSequentially } from './utils';

export class SetupManager {
    private readonly fs: InternalFileSystem;

    constructor() {
        this.fs = new InternalFileSystem();
    }

    directories() {
        const dirs = this.fs.dirs;
        mkdirIfNotExists(dirs.gitsecrets);
        mkdirIfNotExists(dirs.data);
        mkdirIfNotExists(dirs.keys);
    }

    files() {
        const files = this.fs.files;
        writeFileIfNotExists(path.resolve(this.fs.dirs.gitsecrets, '.gitignore'), GIT_IGNORE, 'utf-8');
        writeFileIfNotExists(files.dataSignatures, JSON.stringify({}, null, 4), 'utf-8');
        writeFileIfNotExists(files.settings, JSON.stringify(SETTINGS, null, 4), 'utf-8');
        writeFileIfNotExists(files.localSettings, JSON.stringify(LOCAL_SETTINGS, null, 4), 'utf-8');
    }

    database() {
        const db = new Database(this.fs.files.db);
        db.pragma('foreign_keys = ON');
        const sqlFileContents = fs.readFileSync(path.resolve(__dirname, 'db', 'schema.sql'), 'utf-8');
        runSQLSequentially(db, sqlFileContents);
    }
}

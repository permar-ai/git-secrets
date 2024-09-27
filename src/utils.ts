/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {PathLike, WriteFileOptions} from 'fs';
import type {Database as DatabaseType} from 'better-sqlite3';

import * as fs from 'fs';

export function toArray(value: any) {
    return Array.isArray(value) ? value : value ? [value] : [];
}

export function mkdirIfNotExists(path: PathLike, options: { recursive: true } = {recursive: true}) {
    if (fs.existsSync(path)) return;
    fs.mkdirSync(path, options);
}

export function readFileIfExists(
    path: PathLike,
    options?: { encoding?: null | undefined; flag?: string | undefined } | null,
) {
    if (fs.existsSync(path)) return fs.readFileSync(path, options);
}

export function writeFileIfNotExists(file: PathLike, data: string, options?: WriteFileOptions) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, data, options);
}

export function runSQLSequentially(db: Database, sql: string, data: Record<string, any> = {}) {
    const statements = sql
        .split(';')
        .slice(0, -1);
    statements.map((stmt) => db.prepare(stmt + ';').run(data));
}

export function runSQLAsTransaction(db: DatabaseType, sql: string, data: Record<string, any> = {}) {
    const statements = sql
        .split(';')
        .slice(0, -1)
        .map((stmt) => db.prepare(stmt + ';'));
    const transaction = db.transaction(() => statements.forEach((stmt) => stmt.run(data)));
    transaction();
}

/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { PathLike, WriteFileOptions } from 'fs';
import type { Database as DatabaseType } from 'better-sqlite3';

import * as fs from 'fs';
import chalk from 'chalk';

export function toArray(value: any) {
    return Array.isArray(value) ? value : value ? [value] : [];
}

export function mkdirIfNotExists(path: PathLike, options: { recursive: true } = { recursive: true }) {
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

export function runSQLSequentially(db: DatabaseType, sql: string, data: Record<string, any> = {}) {
    const statements = sql.split(';').slice(0, -1);
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

type FlattenedObject = { [key: string]: any };

export function flatten(obj: { [key: string]: any }, prefix = '', separator = '.') {
    return Object.keys(obj).reduce((acc: FlattenedObject, k) => {
        const pre = prefix.length ? prefix + separator : '';

        // Arrays
        if (Array.isArray(obj[k])) {
            obj[k].forEach((item: any, index: number) => {
                if (typeof item === 'object' && item !== null) {
                    Object.assign(acc, flatten(item, `${pre}${k}[${index}]`, separator));
                } else {
                    acc[`${pre}${k}[${index}]`] = item;
                }
            });
        }
        // Objects
        else if (typeof obj[k] === 'object' && obj[k] !== null) {
            Object.assign(acc, flatten(obj[k], pre + k, separator));
        }
        // Primitives
        else {
            acc[pre + k] = obj[k];
        }

        return acc;
    }, {});
}

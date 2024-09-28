/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Database from 'better-sqlite3';

import { MaybeEmpty } from '@/dto';
import { BaseUUIDTableConfigs, BaseRelationshipTableConfigs } from './tables.base.dto';

export class BaseUUIDTable {
    protected readonly db: InstanceType<typeof Database>;
    protected readonly table: string;
    protected readonly sortBy: string | undefined;

    constructor(configs: BaseUUIDTableConfigs) {
        this.db = configs.db;
        this.table = configs.table;
        this.sortBy = configs.sortBy;
    }

    findAll(): any[] {
        const cmd =
            `SELECT *
                     FROM ${this.table}` + (this.sortBy ? ` ORDER BY ${this.sortBy} ASC;` : ';');
        const stmt = this.db.prepare(cmd);
        return stmt.all();
    }

    findOne(id: string): MaybeEmpty<any> {
        const cmd = `SELECT *
                     FROM ${this.table}
                     WHERE id = :id
                     LIMIT 1;`;
        const stmt = this.db.prepare(cmd);
        const data = stmt.get({ id }) ?? {};
        return data as MaybeEmpty<any>;
    }

    remove(id: string) {
        const cmd = `DELETE
                     FROM ${this.table}
                     WHERE id = :id;`;
        const stmt = this.db.prepare(cmd);
        stmt.run({ id });
    }
}

export class BaseRelationshipTable {
    private readonly db: InstanceType<typeof Database>;
    private readonly table: string;
    private readonly key1: string;
    private readonly key2: string;

    constructor(configs: BaseRelationshipTableConfigs) {
        this.db = configs.db;
        this.table = configs.table;
        this.key1 = configs.key1;
        this.key2 = configs.key2;
    }

    findAll(): any[] {
        const cmd = `SELECT *
                     FROM ${this.table}
                     ORDER BY ${this.key1}, ${this.key2};`;
        const stmt = this.db.prepare(cmd);
        return stmt.all();
    }

    findAllByKey1({ key1 }: { key1: string }): any[] {
        const cmd = `SELECT *
                     FROM ${this.table}
                     WHERE ${this.key1} = :value
                     ORDER BY ${this.key1}, ${this.key2};`;
        const stmt = this.db.prepare(cmd);
        return stmt.all({ value: key1 });
    }

    findAllByKey2({ key2 }: { key2: string }): any[] {
        const cmd = `SELECT *
                     FROM ${this.table}
                     WHERE ${this.key2} = :value
                     ORDER BY ${this.key1}, ${this.key2};`;
        const stmt = this.db.prepare(cmd);
        return stmt.all({ value: key2 });
    }

    addRelationship({ key1, key2 }: { key1: string; key2: string }) {
        const cmd = `INSERT INTO ${this.table} (${this.key1}, ${this.key2})
                     VALUES (:value1, :value2)
                     ON CONFLICT(${this.key1}, ${this.key2})
                         DO NOTHING;`;
        const stmt = this.db.prepare(cmd);
        stmt.run({ value1: key1, value2: key2 });
    }

    removeRelationship({ key1, key2 }: { key1: string; key2: string }) {
        const cmd = `DELETE
                     FROM ${this.table}
                     WHERE ${this.key1} = :value1
                       AND ${this.key2} = :value2;`;
        const stmt = this.db.prepare(cmd);
        stmt.run({ value1: key1, value2: key2 });
    }
}

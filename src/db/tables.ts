/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Database from 'better-sqlite3';
import type { MaybeNull } from '@/dto';

import { v4 as uuidv4 } from 'uuid';

import { BaseTableConfigs } from './tables.base.dto';
import { User, Team, File, Collection } from './tables.dto';
import {
    KeyValue,
    UserCreate,
    UserUpdate,
    TeamCreate,
    TeamUpdate,
    FileCreate,
    FileUpdate,
    CollectionCreate,
    CollectionUpdate,
} from './tables.dto';
import { BaseUUIDTable } from './tables.base';

export class Metadata {
    private readonly db: InstanceType<typeof Database>;
    private readonly table: string;

    constructor(configs: BaseTableConfigs) {
        this.db = configs.db;
        this.table = 'metadata';
    }

    get(key: string): MaybeNull<KeyValue> {
        const cmd = `SELECT *
                     FROM ${this.table}
                     WHERE key = : key
                     LIMIT 1;`;
        const stmt = this.db.prepare(cmd);
        return <MaybeNull<KeyValue>>stmt.get({ key: key });
    }

    create(input: KeyValue) {
        const { key, value } = input;
        const cmd = `INSERT INTO ${this.table} (key, value)
                     VALUES (:key, :value);`;
        this.db.prepare(cmd).run({ key: key, value: value });
    }

    update(input: KeyValue) {
        const { key, value } = input;
        const cmd = `UPDATE ${this.table}
                     SET value = :value
                     WHERE key = : key`;
        this.db.prepare(cmd).run({ key: key, value: value });
    }
}

export class Users extends BaseUUIDTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'users', sortBy: 'email' });
    }

    getByEmail(email: string): MaybeNull<User> {
        const cmd = `SELECT *
                     FROM ${this.table}
                     WHERE email = :email
                     LIMIT 1;`;
        const data = this.db.prepare(cmd).get({ email }) ?? null;
        return data as MaybeNull<User>;
    }

    create(data: UserCreate): string {
        const { id = uuidv4(), email, name } = data;
        const cmd = `INSERT INTO ${this.table} (id, email, name)
                     VALUES (:id, :email, :name);`;
        this.db.prepare(cmd).run({ id, email, name });
        return id;
    }

    update(id: string, data: UserUpdate) {
        const { email, name } = data;
        const variables = [email, name];
        const updateStatements = ['email = :email', 'name = :name'];
        const updateStmt = updateStatements.filter((_, idx) => variables[idx]).join(', ');
        if (updateStmt === '') return;

        // Update
        const cmd = `UPDATE ${this.table}
                     SET ${updateStmt}
                     WHERE id = :id`;
        this.db.prepare(cmd).run({ id: id, email: email, name: name });
    }

    removeByEmail(email: string) {
        const user = this.getByEmail(email);
        if (!user?.id) return;
        this.remove(user.id);
    }
}

export class Teams extends BaseUUIDTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'teams', sortBy: 'name' });
    }

    getByName(name: string): MaybeNull<Team> {
        const cmd = `SELECT *
                     FROM ${this.table}
                     WHERE name = :name
                     LIMIT 1;`;
        const data = this.db.prepare(cmd).get({ name }) ?? null;
        return data as MaybeNull<Team>;
    }

    create(data: TeamCreate) {
        const { id = uuidv4(), name, description } = data;
        const cmd = `INSERT INTO ${this.table} (id, name, description)
                     VALUES (:id, :name, :description);`;
        this.db.prepare(cmd).run({ id: id, name: name, description: description });
        return id;
    }

    update(id: string, data: TeamUpdate) {
        const { name, description } = data;
        const variables = [name, description];
        const updateStatements = ['name = :name', 'description = :description'];
        const updateStmt = updateStatements.filter((_, idx) => variables[idx]).join(', ');
        if (updateStmt === '') return;

        // Update
        const cmd = `UPDATE ${this.table}
                     SET ${updateStmt}
                     WHERE id = :id`;
        this.db.prepare(cmd).run({ id: id, name: name, description: description });
    }

    removeByName(name: string) {
        const user = this.getByName(name);
        if (!user?.id) return;
        this.remove(user.id);
    }
}

export class Files extends BaseUUIDTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'files', sortBy: 'path' });
    }

    getByPath(path: string): MaybeNull<File> {
        const cmd = `SELECT *
                     FROM ${this.table}
                     WHERE path = :path
                     LIMIT 1;`;
        const data = this.db.prepare(cmd).get({ path }) ?? null;
        return data as MaybeNull<File>;
    }

    create(data: FileCreate): string {
        const { id = uuidv4(), path, contentsSignature, accessSignature } = data;
        const cmd = `INSERT INTO ${this.table} (id, path, contents_signature, access_signature)
                     VALUES (:id, :path, :contents_signature, :access_signature);`;
        this.db
            .prepare(cmd)
            .run({ id, path, contents_signature: contentsSignature, access_signature: accessSignature });
        return id;
    }

    update(id: string, data: FileUpdate) {
        const { path, contentsSignature, accessSignature } = data;
        const variables = [path, contentsSignature, accessSignature];
        const updateStatements = [
            'path = :path',
            'contents_signature = :contents_signature',
            'access_signature = :access_signature',
        ];
        const updateStmt = updateStatements.filter((_, idx) => variables[idx]).join(', ');

        const cmd = `UPDATE ${this.table}
                     SET ${updateStmt}
                     WHERE id = :id`;
        this.db.prepare(cmd).run({ id: id, contents_signature: contentsSignature, access_signature: accessSignature });
    }

    removeByPath(path: string) {
        const file = this.getByPath(path);
        if (!file?.id) return;
        this.remove(file.id);
    }
}

export class Collections extends BaseUUIDTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'collections', sortBy: 'name' });
    }

    getByName(name: string): MaybeNull<Collection> {
        const cmd = `SELECT *
                     FROM ${this.table}
                     WHERE name = :name
                     LIMIT 1;`;
        const data = this.db.prepare(cmd).get({ name }) ?? null;
        return data as MaybeNull<Collection>;
    }

    create(data: CollectionCreate): string {
        const { id = uuidv4(), name, description } = data;
        const cmd = `INSERT INTO ${this.table} (id, name, description)
                     VALUES (:id, :name, :description);`;
        this.db.prepare(cmd).run({ id, name, description });
        return id;
    }

    update(id: string, data: CollectionUpdate) {
        const { name, description } = data;
        const variables = [name, description];
        const updateStatements = ['name = :name', 'description = :description'];
        const updateStmt = updateStatements.filter((_, idx) => variables[idx]).join(', ');

        const cmd = `UPDATE ${this.table}
                     SET ${updateStmt}
                     WHERE id = :id`;
        this.db.prepare(cmd).run({ id: id, name: name, description: description });
    }

    removeByName(name: string) {
        const collection = this.getByName(name);
        if (!collection?.id) return;
        this.remove(collection.id);
    }
}

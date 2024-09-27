/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Database from 'better-sqlite3';
import type { MaybeNull } from '@/dto';

import { uuid } from 'uuidv4';

import { BaseTableConfigs } from './tables.base.dto';
import { User, Team, File } from './tables.dto';
import { KeyValue, UserCreate, TeamCreate, FileCreate, FileUpdate } from './tables.dto';
import { BaseUUIDTable, BaseRelationshipTable } from './tables.base';

export class Metadata {
    private readonly db: Database;
    private readonly table: string;

    constructor(configs: BaseTableConfigs) {
        this.db = configs.db;
        this.table = 'metadata';
    }

    get(key: string): MaybeNull<KeyValue> {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE key = : key
                                          LIMIT 1;`);
        return <MaybeNull<KeyValue>>stmt.get({ key: key });
    }

    create(input: KeyValue) {
        const { key, value } = input;
        const stmt = this.db.prepare(`INSERT INTO ${this.table} (key, value)
                                      VALUES (:key, :value);`);
        stmt.run({ key: key, value: value });
    }

    update(input: KeyValue) {
        const { key, value } = input;
        const stmt = this.db.prepare(`UPDATE ${this.table}
                                      SET value = :value
                                      WHERE key = : key`);
        stmt.run({ key: key, value: value });
    }
}

export class Users extends BaseUUIDTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'users' });
    }

    getByEmail(email: string): MaybeNull<User> {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE email = :email LIMIT 1;`);
        const data = stmt.get({ email }) ?? null;
        return data as MaybeNull<User>;
    }

    create(input: UserCreate): string {
        const { id = uuid(), email, name } = input;
        const stmt = this.db.prepare(`INSERT INTO ${this.table} (id, email, name)
                                      VALUES (:id, :email, :name);`);
        stmt.run({ id, email, name });
        return id;
    }

    removeByEmail(email: string) {
        const { id } = this.getByEmail(email);
        if (!id) return;
        this.remove(id);
    }
}

export class Teams extends BaseUUIDTable {
    constructor({ db }) {
        super({ db: db, table: 'teams' });
    }

    getByName(name: string): MaybeNull<Team> {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE name = :name LIMIT 1;`);
        const data = stmt.get({ name }) ?? null;
        return data as MaybeNull<Team>;
    }

    create(input: TeamCreate) {
        const { id = uuid(), name, description } = input;
        const stmt = this.db.prepare(`INSERT INTO ${this.table} (id, name, description)
                                      VALUES (:id, :name, :description);`);
        stmt.run({ id: id, name: name, description: description });
        return id;
    }

    removeByName(name: string) {
        const { id } = this.getByName(name);
        if (!id) return;
        this.remove(id);
    }
}

export class TeamMembers extends BaseRelationshipTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'team_members', key1: 'team_id', key2: 'user_id' });
    }

    add({ teamId, userId }: { teamId: string; userId: string }) {
        this.addRelationship({ key1: teamId, key2: userId });
    }

    remove({ teamId, userId }: { teamId: string; userId: string }) {
        this.removeRelationship({ key1: teamId, key2: userId });
    }
}

export class Files extends BaseUUIDTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'files' });
    }

    getByPath(path: string): MaybeNull<File> {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE path = :path LIMIT 1;`);
        const data = stmt.get({ path }) ?? null;
        return data as MaybeNull<File>;
    }

    create(input: FileCreate): string {
        const { id = uuid(), path, contents_signature, access_signature } = input;
        const stmt = this.db.prepare(`INSERT INTO ${this.table} (id, path, contents_signature, access_signature)
                                      VALUES (:id, :path, :contents_signature, :access_signature);`);
        stmt.run({ id, path, contents_signature, access_signature });
        return id;
    }

    update(input: FileUpdate) {
        const { id, path, contents_signature, access_signature } = input;
        const variables = [path, contents_signature, access_signature];
        const updateStatements = [
            'path = :path',
            'contents_signature = :contents_signature',
            'access_signature = :access_signature',
        ];
        const updateStmt = updateStatements.filter((_, idx) => variables[idx]).join(', ');

        const stmt = this.db.prepare(`UPDATE ${this.table}
                                      SET ${updateStmt}
                                      WHERE id = :id`);
        stmt.run({ id, contents_signature, access_signature });
    }

    removeByPath(path: string) {
        const { id } = this.getByPath(path);
        if (!id) return;
        this.remove(id);
    }
}

export class FileUsers extends BaseRelationshipTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'file_users', key1: 'file_id', key2: 'user_id' });
    }

    add({ fileId, userId }: { fileId: string; userId: string }) {
        this.addRelationship({ key1: fileId, key2: userId });
    }

    remove({ fileId, userId }: { fileId: string; userId: string }) {
        this.removeRelationship({ key1: fileId, key2: userId });
    }
}

export class FileTeams extends BaseRelationshipTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'file_teams', key1: 'file_id', key2: 'team_id' });
    }

    add({ fileId, teamId }: { fileId: string; teamId: string }) {
        this.addRelationship({ key1: fileId, key2: teamId });
    }

    remove({ fileId, teamId }: { fileId: string; teamId: string }) {
        this.removeRelationship({ key1: fileId, key2: teamId });
    }
}

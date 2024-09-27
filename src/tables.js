/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const { uuid } = require('uuidv4');

const { BaseUUIDTable, BaseRelationshipTable } = require('./tables.base');

class Metadata {
    constructor({ db }) {
        this.db = db;
        this.table = 'metadata';
    }

    get(key) {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE key = :key
                                      LIMIT 1;`);
        return stmt.get({ key: key });
    }

    create({ key, value }) {
        const stmt = this.db.prepare(`INSERT INTO ${this.table} (key, value)
                                      VALUES (:key, :value);`);
        stmt.run({ key: key, value: value });
    }

    update({ key, value }) {
        const stmt = this.db.prepare(`UPDATE ${this.table}
                                      SET value = :value
                                      WHERE key = :key`);
        stmt.run({ key: key, value: value });
    }
}

class Users extends BaseUUIDTable {
    constructor({ db }) {
        super({ db: db, table: 'users' });
    }

    getByEmail(email) {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE email = :email
                                      LIMIT 1;`);
        return stmt.get({ email }) || {};
    }

    create({ id = uuid(), email, name }) {
        const stmt = this.db.prepare(`INSERT INTO ${this.table} (id, email, name)
                                      VALUES (:id, :email, :name);`);
        stmt.run({ id, email, name });
        return id;
    }

    removeByEmail(email) {
        const { id } = this.getByEmail(email);
        if (!id) return;
        this.remove(id);
    }
}

class Teams extends BaseUUIDTable {
    constructor({ db }) {
        super({ db: db, table: 'teams' });
    }

    getByName(name) {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE name = :name
                                      LIMIT 1;`);
        return stmt.get({ name }) || {};
    }

    create({ id = uuid(), name, description }) {
        const stmt = this.db.prepare(`INSERT INTO ${this.table} (id, name, description)
                                      VALUES (:id, :name, :description);`);
        stmt.run({ id: id, name: name, description: description });
        return id;
    }

    removeByName(name) {
        const { id } = this.getByName(name);
        if (!id) return;
        this.remove(id);
    }
}

class TeamMembers extends BaseRelationshipTable {
    constructor({ db }) {
        super({ db, table: 'team_members', key1: 'team_id', key2: 'user_id' });
    }

    add({ teamId, userId }) {
        this.addRelationship({ key1: teamId, key2: userId });
    }

    remove({ fileId, userId }) {
        this.removeRelationship({ key1: fileId, key2: userId });
    }
}

class Files extends BaseUUIDTable {
    constructor({ db }) {
        super({ db: db, table: 'files' });
    }

    getByPath(path) {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE path = :path
                                      LIMIT 1;`);
        return stmt.get({ path }) || {};
    }

    create({ id, path, contents_signature, access_signature }) {
        const stmt = this.db.prepare(`INSERT INTO ${this.table} (id, path, contents_signature, access_signature)
                                      VALUES (:id, :path, :contents_signature, :access_signature);`);
        if (!id) id = uuid();
        stmt.run({ id, path, contents_signature, access_signature });
        return id;
    }

    update({ id, path, contents_signature, access_signature }) {
        const variables = [path, contents_signature, access_signature];
        const updateStatements = ['path = :path', 'contents_signature = :contents_signature', 'access_signature = :access_signature'];
        const updateStmt = updateStatements.filter((_, idx) => variables[idx]).join(', ');

        const stmt = this.db.prepare(`UPDATE ${this.table}
                                      SET ${updateStmt}
                                      WHERE id = :id`);
        stmt.run({ id, contents_signature, access_signature });
    }

    removeByPath(path) {
        const { id } = this.getByPath(path);
        if (!id) return;
        this.remove(id);
    }
}

class FileUsers extends BaseRelationshipTable {
    constructor({ db }) {
        super({ db: db, table: 'file_users', key1: 'file_id', key2: 'user_id' });
    }

    add({ fileId, userId }) {
        this.addRelationship({ key1: fileId, key2: userId });
    }

    remove({ fileId, userId }) {
        this.removeRelationship({ key: fileId, key2: userId });
    }
}

class FileTeams extends BaseRelationshipTable {
    constructor({ db }) {
        super({ db: db, table: 'file_teams', key1: 'file_id', key2: 'team_id' });
    }

    add({ fileId, teamId }) {
        this.addRelationship({ key1: fileId, key2: teamId });
    }

    remove({ fileId, teamId }) {
        this.removeRelationship({ key: fileId, key2: teamId });
    }
}

module.exports = {
    Metadata,
    Users,
    Teams,
    TeamMembers,
    Files,
    FileUsers,
    FileTeams,
};

/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

class BaseUUIDTable {
    constructor({ db, table }) {
        this.db = db;
        this.table = table;
    }

    findAll() {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table};`);
        return stmt.all();
    }

    findOne(id) {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE id = :id
                                      LIMIT 1;`);
        return stmt.get({ id }) || {};
    }

    remove(id) {
        const stmt = this.db.prepare(`DELETE
                                      FROM ${this.table}
                                      WHERE id = :id;`);
        stmt.run({ id });
    }
}

class BaseRelationshipTable {
    constructor({ db, table, key1, key2 }) {
        this.db = db;
        this.table = table;
        this.key1 = key1;
        this.key2 = key2;
    }

    findAll() {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      ORDER BY ${this.key1}, ${this.key2};`);
        return stmt.all();
    }

    findAllByKey1({ key1 }) {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE ${this.key1} = :value
                                      ORDER BY ${this.key1}, ${this.key2};`);
        return stmt.all({ value: key1 });
    }

    findAllByKey2({ key2 }) {
        const stmt = this.db.prepare(`SELECT *
                                      FROM ${this.table}
                                      WHERE ${this.key2} = :value
                                      ORDER BY ${this.key1}, ${this.key2};`);
        return stmt.all({ value: key2 });
    }

    addRelationship({ key1, key2 }) {
        const stmt = this.db.prepare(`INSERT INTO ${this.table} (${this.key1}, ${this.key2})
                                      VALUES (:value1, :value2)
                                      ON CONFLICT(${this.key1}, ${this.key2})
                                          DO NOTHING;`);
        stmt.run({ value1: key1, value2: key2 });
    }

    removeRelationship({ key1, key2 }) {
        const stmt = this.db.prepare(`DELETE
                                      FROM ${this.table}
                                      WHERE ${this.key1} = :value1
                                        AND ${this.key2} = :value2;`);
        stmt.run({ value1: key1, value2: key2 });
    }
}

module.exports = {
    BaseUUIDTable,
    BaseRelationshipTable,
};
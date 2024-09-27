/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const fs = require('fs');
const path = require('path');

function toArray(value) {
    return Array.isArray(value) ? value : (value ? [value] : []);
}

function mkdirIfNotExists(path, options = null) {
    if (fs.existsSync(path)) return;
    fs.mkdirSync(path, options);
}

function readFileIfExists(path, options = null) {
    if (fs.existsSync(path)) return fs.readFileSync(path, options);
}

function writeFileIfNotExists(file, data, options = null) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, data, options);
}

function runAsTransaction({ db, sql, data = {} }) {
    const statements = sql.split(';').slice(0, -1).map((stmt) => db.prepare(stmt + ';'));
    const transaction = db.transaction(() => statements.forEach((stmt) => stmt.run(data)));
    transaction();
}

module.exports = {
    toArray,
    mkdirIfNotExists,
    readFileIfExists,
    writeFileIfNotExists,
    runAsTransaction
};

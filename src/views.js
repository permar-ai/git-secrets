/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

class FileAccess {
    constructor({ db }) {
        this.db = db;
        this.view = 'files_access_view';
    }

    findAllUsersIds({ fileId }) {
        const stmt = this.db.prepare(`SELECT *
                                      from ${this.view}
                                      WHERE file_id = :fileId
                                      ORDER BY file_id, user_id;`);
        const data = stmt.all({ fileId: fileId });
        const usersIds = data.map((item) => item.user_id);
        return [...new Set(usersIds)].sort();
    }

    findAllFileIds({ userId }) {
        const stmt = this.db.prepare(`SELECT *
                                      from ${this.view}
                                      WHERE user_id = :userId
                                      ORDER BY file_id, user_id;`);
        const data = stmt.all({ userId: userId });
        const fileIds = data.map((item) => item.file_id);
        return [...new Set(fileIds)].sort();
    }
}

module.exports = {
    FileAccess
};

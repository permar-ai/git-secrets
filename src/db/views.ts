/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Database from 'better-sqlite3';

import { BaseTableConfigs } from './tables.base.dto';
import { FileAccessDto } from './views.dto';

export class FileAccess {
    private readonly db: InstanceType<typeof Database>;
    private readonly view: string;

    constructor(configs: BaseTableConfigs) {
        this.db = configs.db;
        this.view = 'files_access_view';
    }

    findAllUsersIds({ fileId }: { fileId: string }): string[] {
        const stmt = this.db.prepare(`SELECT *
                                      from ${this.view}
                                      WHERE file_id = :fileId
                                      ORDER BY file_id, user_id;`);
        const data = stmt.all({ fileId: fileId }) as FileAccessDto[];
        const usersIds = data.map((item) => item.user_id);
        return [...new Set(usersIds)].sort();
    }

    findAllFileIds({ userId }: { userId: string }): string[] {
        const stmt = this.db.prepare(`SELECT *
                                      from ${this.view}
                                      WHERE user_id = :userId
                                      ORDER BY file_id, user_id;`);
        const data = stmt.all({ userId: userId }) as FileAccessDto[];
        const fileIds = data.map((item) => item.file_id);
        return [...new Set(fileIds)].sort();
    }
}

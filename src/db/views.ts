/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Database from 'better-sqlite3';

import { BaseTableConfigs } from './tables.base.dto';
import { TeamUserDto, CollectionFileDto, FileAccessDto } from './views.dto';

export class TeamUsersView {
    private readonly db: InstanceType<typeof Database>;
    private readonly view: string;

    constructor(configs: BaseTableConfigs) {
        this.db = configs.db;
        this.view = 'team_users_view';
    }

    findAll({ team, user }: { team?: string; user?: string }): TeamUserDto[] {
        // Return all
        if (!team && !user) {
            const cmd = `SELECT *
                         FROM ${this.view}
                         ORDER BY team, user;`;
            return this.db.prepare(cmd).all() as TeamUserDto[];
        }

        // Filtered results
        const variables = [team, user];
        const whereStatements = ['team = :team', 'user = :user'];
        const whereStmt = whereStatements.filter((_, idx) => variables[idx]).join(' AND ');
        const cmd = `SELECT *
                     FROM ${this.view}
                     WHERE ${whereStmt}
                     ORDER BY team, user;`;
        return this.db.prepare(cmd).all({ team: team, user: user }) as TeamUserDto[];
    }

    findAllUsers({ team }: { team: string }): TeamUserDto[] {
        return this.findAll({ team: team });
    }

    findAllTeams({ user }: { user: string }): TeamUserDto[] {
        return this.findAll({ user: user });
    }
}

export class CollectionFilesView {
    private readonly db: InstanceType<typeof Database>;
    private readonly view: string;

    constructor(configs: BaseTableConfigs) {
        this.db = configs.db;
        this.view = 'collection_files_view';
    }

    findAll({ collection, file }: { collection?: string; file?: string }): CollectionFileDto[] {
        // Return all
        if (!collection && !file) {
            const cmd = `SELECT *
                         FROM ${this.view}
                         ORDER BY collection, file;`;
            return this.db.prepare(cmd).all() as CollectionFileDto[];
        }

        // Filtered results
        const variables = [collection, file];
        const whereStatements = ['collection = :collection', 'file = :file'];
        const whereStmt = whereStatements.filter((_, idx) => variables[idx]).join(' AND ');
        const cmd = `SELECT *
                     FROM ${this.view}
                     WHERE ${whereStmt}
                     ORDER BY collection, file;`;
        return this.db.prepare(cmd).all({ collection: collection, file: file }) as CollectionFileDto[];
    }

    findAllFiles({ collection }: { collection: string }): CollectionFileDto[] {
        return this.findAll({ collection: collection });
    }

    findAllCollections({ file }: { file: string }): CollectionFileDto[] {
        return this.findAll({ file: file });
    }
}

export class FileAccessView {
    private readonly db: InstanceType<typeof Database>;
    private readonly view: string;

    constructor(configs: BaseTableConfigs) {
        this.db = configs.db;
        this.view = 'file_access_view';
    }

    findAll({ path, email }: { path?: string; email?: string }) {
        // Return all
        if (!path && !email) {
            const cmd = `SELECT *
                         FROM ${this.view}
                         ORDER BY file, user;`;
            return this.db.prepare(cmd).all() as FileAccessDto[];
        }

        // Filtered results
        const variables = [path, email];
        const whereStatements = ['file = :file', 'user = :user'];
        const whereStmt = whereStatements.filter((_, idx) => variables[idx]).join(' AND ');
        const cmd = `SELECT *
                     FROM ${this.view}
                     WHERE ${whereStmt}
                     ORDER BY file, user;`;
        return this.db.prepare(cmd).all({ file: path, user: email }) as FileAccessDto[];
    }

    findAllUsersIds({ path }: { path: string }): string[] {
        const data = this.findAll({ path });
        const usersIds = data.map((item) => item.user_id);
        return [...new Set(usersIds)].sort();
    }

    findAllFileIds({ email }: { email: string }): string[] {
        const data = this.findAll({ email });
        const fileIds = data.map((item) => item.file_id);
        return [...new Set(fileIds)].sort();
    }
}

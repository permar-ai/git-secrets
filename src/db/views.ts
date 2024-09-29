/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Database from 'better-sqlite3';

import { BaseTableConfigs } from './tables.base.dto';
import { TeamDto, UserDto, FileAccessDto } from './views.dto';

export class TeamUsersView {
    private readonly db: InstanceType<typeof Database>;
    private readonly view: string;

    constructor(configs: BaseTableConfigs) {
        this.db = configs.db;
        this.view = 'team_users_view';
    }

    findAllUsers({ team }: { team: string }): UserDto[] {
        const cmd = `SELECT *
                     from ${this.view}
                     WHERE team = :team
                     ORDER BY team, email;`;
        return this.db.prepare(cmd).all({ team: team }) as UserDto[];
    }

    findAllTeams({ user }: { user: string }): TeamDto[] {
        const cmd = `SELECT *
                     from ${this.view}
                     WHERE email = :email
                     ORDER BY team, email;`;
        return this.db.prepare(cmd).all({ email: user }) as TeamDto[];
    }
}

export class FileAccessView {
    private readonly db: InstanceType<typeof Database>;
    private readonly view: string;

    constructor(configs: BaseTableConfigs) {
        this.db = configs.db;
        this.view = 'file_access_view';
    }

    findAll({ fileId, userId }: { fileId?: string; userId?: string }) {
        const variables = [fileId, userId];
        const whereStatements = ['file_id = :fileId', 'user_id = :userId'];
        const whereStmt = whereStatements.filter((_, idx) => variables[idx]).join(' AND ');
        const cmd = `SELECT *
                     from ${this.view}
                     WHERE ${whereStmt}
                     ORDER BY file_id, user_id;`;
        return this.db.prepare(cmd).all({ fileId: fileId, userId: userId }) as FileAccessDto[];
    }

    findAllUsersIds({ fileId }: { fileId: string }): string[] {
        const data = this.findAll({ fileId });
        const usersIds = data.map((item) => item.user_id);
        return [...new Set(usersIds)].sort();
    }

    findAllFileIds({ userId }: { userId: string }): string[] {
        const data = this.findAll({ userId });
        const fileIds = data.map((item) => item.file_id);
        return [...new Set(fileIds)].sort();
    }
}

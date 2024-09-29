/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { BaseTableConfigs } from './tables.base.dto';
import { BaseRelationshipTable } from './tables.base';

export class TeamUsers extends BaseRelationshipTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'team_users', key1: 'team_id', key2: 'user_id' });
    }

    add({ teamId, userId }: { teamId: string; userId: string }) {
        this.addRelationship({ key1: teamId, key2: userId });
    }

    remove({ teamId, userId }: { teamId: string; userId: string }) {
        this.removeRelationship({ key1: teamId, key2: userId });
    }
}

export class CollectionFiles extends BaseRelationshipTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'collection_files', key1: 'collection_id', key2: 'file_id' });
    }

    add({ collectionId, fileId }: { collectionId: string; fileId: string }) {
        this.addRelationship({ key1: collectionId, key2: fileId });
    }

    remove({ collectionId, fileId }: { collectionId: string; fileId: string }) {
        this.removeRelationship({ key1: collectionId, key2: fileId });
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

export class CollectionUsers extends BaseRelationshipTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'collection_users', key1: 'collection_id', key2: 'user_id' });
    }

    add({ collectionId, userId }: { collectionId: string; userId: string }) {
        this.addRelationship({ key1: collectionId, key2: userId });
    }

    remove({ collectionId, userId }: { collectionId: string; userId: string }) {
        this.removeRelationship({ key1: collectionId, key2: userId });
    }
}

export class CollectionTeams extends BaseRelationshipTable {
    constructor(configs: BaseTableConfigs) {
        super({ db: configs.db, table: 'collection_teams', key1: 'collection_id', key2: 'team_id' });
    }

    add({ collectionId, teamId }: { collectionId: string; teamId: string }) {
        this.addRelationship({ key1: collectionId, key2: teamId });
    }

    remove({ collectionId, teamId }: { collectionId: string; teamId: string }) {
        this.removeRelationship({ key1: collectionId, key2: teamId });
    }
}

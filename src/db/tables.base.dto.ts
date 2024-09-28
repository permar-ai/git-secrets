/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Database from 'better-sqlite3';

export interface BaseTableConfigs {
    db: InstanceType<typeof Database>;
}

export interface BaseUUIDTableConfigs extends BaseTableConfigs {
    table: string;
    sortBy?: string;
}

export interface BaseRelationshipTableConfigs extends BaseTableConfigs {
    table: string;
    key1: string;
    key2: string;
}

/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { MaybeArray } from '@/dto';
import { User } from './db/tables.dto';

export interface UserAdd {
    email: string;
    name?: string;
    password: string;
}

export interface TeamAdd {
    name: string;
    description?: string;
}

export interface TeamUserAdd {
    teams: MaybeArray<string>; // Team names
    users: MaybeArray<string>; // Users email
}

export interface FileAdd {
    path: string;
}

export interface CollectionAdd {
    name: string;
    description?: string;
}

export interface CollectionFileAdd {
    collections: MaybeArray<string>; // Collection names
    files: MaybeArray<string>; // File path
}

export interface FileAccessAdd {
    files?: MaybeArray<string>; // File paths
    collections?: MaybeArray<string>; // Collection names
    users?: MaybeArray<string> | undefined; // Users email
    teams?: MaybeArray<string> | undefined; // Team names
}

interface CryptoOperationDto {
    email: string;
    password: string;
    modified?: boolean;
}

export interface CryptoSingleInput extends CryptoOperationDto {
    path: string;
}

export interface CryptoAllInput extends CryptoOperationDto {}

export interface FileSignaturesDto {
    contents: string;
    access: string;
}

export interface UserKeyUpdate {
    email: string;
    password: string;
}

interface UserSensitive extends User {
    password?: string;
}

export interface LocalSettingsDto {
    user?: UserSensitive;
}

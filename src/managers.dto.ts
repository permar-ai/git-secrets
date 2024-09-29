/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { PublicKey } from 'openpgp';

import { User, File } from './db/tables.dto';
import { KeyPair } from './encryption.dto';

type MaybeArray<T> = T | Array<T>;

export interface UserAdd {
    email: string;
    name?: string;
    password: string;
}

export interface TeamAdd {
    name: string;
    description?: string;
}

export interface TeamMemberAdd {
    teams: MaybeArray<string>; // Team names
    users: MaybeArray<string>; // Users email
}

export interface FileAccessAdd {
    files: MaybeArray<string>; // File paths
    users: MaybeArray<string> | undefined; // Users email
    teams: MaybeArray<string> | undefined; // Team names
}

export interface CryptoOpInput {
    path: string;
    email: string;
    password: string;
}

export interface CryptoOpPrivateInput {
    file: File;
    user: User;
    password: string;
    publicKeys: PublicKey[];
    userKeys: KeyPair;
}

export interface UserKeyUpdate {
    email: string;
    password: string;
}

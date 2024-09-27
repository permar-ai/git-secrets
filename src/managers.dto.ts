/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
    teamIds: MaybeArray<string>;
    userIds: MaybeArray<string>;
}

export interface FileAccessAdd {
    fileIds: MaybeArray<string>;
    userIds: MaybeArray<string>;
    teamIds: MaybeArray<string>;
}

export interface EncryptFileInput {
    fileId: string;
    userId: string;
    password: string;
}

export interface DecryptFileInput {
    fileId: string;
    userId: string;
    password: string;
}

export interface UserKeyUpdate {
    userId: string;
    password: string;
}

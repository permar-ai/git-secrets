/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export interface KeyValue {
    key: string;
    value: string;
}

interface BaseUUID {
    id: string;
}

export interface User extends BaseUUID {
    email: string;
    name?: string;
}

export interface UserCreate {
    id?: string;
    email: string;
    name?: string;
}

export interface UserUpdate {
    email?: string;
    name?: string;
}

export interface Team extends BaseUUID {
    name: string;
    description: string;
}

export interface TeamCreate {
    id?: string;
    name: string;
    description?: string;
}

export interface TeamUpdate {
    name?: string;
    description?: string;
}

export interface File extends BaseUUID {
    path: string;
    contents_signature: string;
    access_signature: string;
}

export interface FileCreate {
    id?: string;
    path: string;
    contentsSignature: string;
    accessSignature: string;
}

export interface FileUpdate {
    path?: string;
    contentsSignature?: string;
    accessSignature?: string;
}

export interface Collection extends BaseUUID {
    name: string;
    description?: string;
}

export interface CollectionCreate {
    id?: string;
    name: string;
    description?: string;
}

export interface CollectionUpdate {
    name?: string;
    description?: string;
}

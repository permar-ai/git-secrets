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

export interface Team extends BaseUUID {
    name: string;
    description: string;
}

export interface TeamCreate {
    id?: string;
    name: string;
    description?: string;
}

export interface TeamMember {
    team_id: string;
    user_id: string;
}

export interface File extends BaseUUID {
    path: string;
    contents_signature: string;
    access_signature: string;
}

export interface FileCreate {
    id?: string;
    path: string;
    contents_signature: string;
    access_signature: string;
}

export interface FileUpdate {
    id: string;
    path?: string;
    contents_signature?: string;
    access_signature?: string;
}

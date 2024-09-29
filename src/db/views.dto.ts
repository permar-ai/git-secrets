/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export interface TeamDto {
    team: string;
}

export interface UserDto {
    email: string;
    name?: string;
}

export interface FileAccessDto {
    file_id: string;
    user_id: string;
    access_type: 'user' | 'team' | 'collection' | 'collection-team';
    path: string;
    email: string;
    user_name?: string;
    team?: string;
    collection?: string;
}

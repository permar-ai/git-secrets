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
    path: string;
    email: string;
    name?: string;
    access_type: 'user' | 'team';
    team?: string;
}

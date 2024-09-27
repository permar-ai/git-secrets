/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Default files
export const GIT_IGNORE = `!keys
!keys/*.public
!keys/*.private
!data.db
local.settings.json
`;
export const LOCAL_SETTINGS = {};

// Directory and file names
export const GIT_SECRETS_DIR = '.gitsecrets';
export const KEYS_DIR = 'keys';
export const LOCAL_SETTINGS_FILENAME = 'local.settings.json';
export const DB_FILENAME = 'data.db';
export const SECRET_EXT = '.secret';

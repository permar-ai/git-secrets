/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Default files
const GIT_IGNORE = `!keys
!keys/*.public
!keys/*.private
!data.db
local.settings.json
`;
const LOCAL_SETTINGS = {};

// Directory and file names
const GIT_SECRETS_DIR = '.gitsecrets';
const KEYS_DIR = 'keys';
const LOCAL_SETTINGS_FILENAME = 'local.settings.json';
const DB_FILENAME = 'data.db';
const SECRET_EXT = '.secret';

module.exports = {
    GIT_IGNORE,
    LOCAL_SETTINGS,
    GIT_SECRETS_DIR,
    KEYS_DIR,
    LOCAL_SETTINGS_FILENAME,
    DB_FILENAME,
    SECRET_EXT
};

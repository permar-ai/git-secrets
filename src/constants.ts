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
!data.db
!settings.json
keys/*.private
local.settings.json
`;
export const SETTINGS = {
    mode: 'live', // or test
    password: {
        mode: 'auto',
        length: '32',
    },
};
export const LOCAL_SETTINGS = {};
export const SECRET_EXT = '.secret';
